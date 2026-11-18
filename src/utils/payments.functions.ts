import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import { z } from "zod";
import { verifiedOrderPayment } from "@/lib/payment-confirmation";
import { findPaidAsaasPayment } from "@/lib/asaas.server";
import { AsaasApiError, asaasApiRequest, backendRpc, getGateway, getSiteUrl } from "@/lib/gateway.server";
import { asaasCheckoutSchema, asaasCheckoutLink, paymentReturnUrl } from "@/lib/asaas";

type Result = { clientSecret: string } | { error: string };

export const confirmOrderPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ orderId: z.string().uuid(), sessionId: z.string().regex(/^cs_(test_)?[A-Za-z0-9]+$/).optional(), environment: z.enum(["sandbox", "live"]) }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase.from("orders").select("id,user_id,total,status,payment_method,payment_ref,created_at,asaas_checkout_id").eq("id", data.orderId).eq("user_id", context.userId).maybeSingle();
    if (error || !order) throw new Error("Pedido não encontrado");
    if (order.status !== "pendente" || order.payment_method !== "online") return { status: order.status };
    try {
      if (order.asaas_checkout_id) {
        const payment = await findPaidAsaasPayment(order.asaas_checkout_id, Number(order.total));
        if (!payment) return { status: "pendente" };
        await backendRpc("backend_confirm_checkout", {
          _order_id: order.id, _checkout_id: order.asaas_checkout_id, _paid: true, _state: "paid"
        });
        const { data: updated, error: readError } = await context.supabase.from("orders").select("status").eq("id", order.id).single();
        if (readError) throw readError;
        return { status: updated.status };
      }
      if (!order.payment_ref?.startsWith("cs_")) return { status: "pendente" };
      const stripe = createStripeClient(data.environment);
      // Retrieve the returned session, or recover it when arriving from account history.
      const sessionId = data.sessionId ?? (order.payment_ref?.startsWith("cs_") ? order.payment_ref : undefined);
      const sessions = sessionId ? [await stripe.checkout.sessions.retrieve(sessionId)] : (await stripe.checkout.sessions.list({ limit: 100, created: { gte: Math.floor(Date.parse(order.created_at) / 1000) } })).data;
      const session = sessions.find((s) => verifiedOrderPayment(s, { ...order, total: Number(order.total) }, data.environment === "live"));
      if (!session) return { status: "pendente" };
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: confirmError } = await supabaseAdmin.rpc("confirm_online_payment", { _order_id: order.id, _paid: true, _ref: session.id });
      if (confirmError) throw confirmError;
      const { data: updated, error: readError } = await context.supabase.from("orders").select("status").eq("id", order.id).single();
      if (readError) throw readError;
      return { status: updated.status };
    } catch (error) {
      console.error("Payment confirmation failed", getStripeErrorMessage(error));
      throw new Error("Não foi possível consultar a confirmação do pagamento. Tente novamente; não pague de novo.");
    }
  });

async function resolveOrCreateCustomer(stripe: ReturnType<typeof createStripeClient>, options: { email?: string | undefined; userId?: string | undefined }) {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");
  if (options.userId) {
    const found = await stripe.customers.search({ query: `metadata['userId']:'${options.userId}'`, limit: 1 });
    const f = found.data[0]; if (f) return f.id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    const customer = existing.data[0];
    if (customer) {
      if (options.userId && customer.metadata?.["userId"] !== options.userId) {
        await stripe.customers.update(customer.id, { metadata: { ...customer.metadata, userId: options.userId } });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

// Charges the order total computed by the database (prices never come from the browser),
// so every product added in the admin panel is payable without extra setup.
export const createLegacyStripeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string; returnUrl: string; environment: StripeEnv }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.orderId)) throw new Error("Pedido inválido");
    if (data.environment !== "sandbox" && data.environment !== "live") throw new Error("Ambiente inválido");
    return data;
  })
  .handler(async ({ data, context }): Promise<Result> => {
    const { supabase, userId } = context;
    const { data: order } = await supabase.from("orders").select("id, code, total, status, payment_method, user_id, payment_ref").eq("id", data.orderId).maybeSingle();
    if (!order || order.user_id !== userId) return { error: "Pedido não encontrado" };
    if (order.payment_method !== "online" || order.status !== "pendente") return { error: "Este pedido não aguarda pagamento" };
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const stripe = createStripeClient(data.environment);
      if (order.payment_ref?.startsWith("cs_")) {
        const existing = await stripe.checkout.sessions.retrieve(order.payment_ref);
        if (existing.status === "open" && existing.client_secret) return { clientSecret: existing.client_secret };
        if (existing.status === "complete") return { error: "Pagamento enviado. Confira a confirmação antes de pagar novamente." };
      }
      const customerId = await resolveOrCreateCustomer(stripe, { email: user?.email ?? undefined, userId });
      const base = {
        line_items: [{
          price_data: { currency: "brl", product_data: { name: `Pedido Crazy #${order.code}` }, unit_amount: Math.round(Number(order.total) * 100) },
          quantity: 1,
        }],
        mode: "payment" as const,
        ui_mode: "embedded_page" as const,
        return_url: data.returnUrl,
        customer: customerId,
        locale: "pt-BR" as const,
        client_reference_id: order.id,
        metadata: { userId, order_id: order.id },
        payment_intent_data: { description: `Pedido Crazy #${order.code}`, metadata: { order_id: order.id } },
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      };
      let session;
      try {
        session = await stripe.checkout.sessions.create({ ...base, payment_method_types: ["card", "pix"] }, { idempotencyKey: `crazy-${order.id}-${order.payment_ref ?? "first"}-pix` });
      } catch {
        // Pix only works once the account is verified in Brazil; fall back to card meanwhile.
        session = await stripe.checkout.sessions.create({ ...base, payment_method_types: ["card"] }, { idempotencyKey: `crazy-${order.id}-${order.payment_ref ?? "first"}-card` });
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: saveError } = await supabaseAdmin.from("orders").update({ payment_ref: session.id }).eq("id", order.id).eq("status", "pendente");
      if (saveError) throw saveError;
      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });


// Backend-claimed checkout prevents duplicate charges after network timeouts.
export const createOrderCheckout=createServerFn({method:"POST"})
 .middleware([requireSupabaseAuth])
 .validator((input:unknown)=>z.object({orderId:z.string().uuid(),origin:z.string().url().optional()}).parse(input))
 .handler(async({data,context})=>{
  const {data:order,error}=await context.supabase.from("orders")
   .select("id,user_id,code,total,status,payment_method,payment_ref,asaas_checkout_id,asaas_checkout_url,asaas_checkout_state,items")
   .eq("id",data.orderId).eq("user_id",context.userId).maybeSingle();
  if(error||!order)return{error:"Pedido não encontrado"};
  if(order.payment_method!=="online"||order.status!=="pendente")return{error:"Este pedido não aguarda pagamento"};
  if(order.payment_ref?.startsWith("cs_"))return{error:"Pedido com cobrança anterior. Consulte a loja."};
  const items=z.array(z.object({product_id:z.string().uuid()})).safeParse(order.items);
  if(!items.success||items.data.length===0)return{error:"Pedido sem produtos válidos."};
  const ids=[...new Set(items.data.map(i=>i.product_id))];
  const {data:available,error:productError}=await context.supabase.from("products").select("id").in("id",ids).eq("active",true);
  if(productError||available?.length!==ids.length)return{error:"Produto retirado do catálogo. Faça um novo pedido."};
  try{
   const gateway=await getGateway();
   if(gateway.mode==="sandbox"){
    const {data:availability,error:availabilityError}=await context.supabase.rpc("store_checkout_availability" as never);
    if(availabilityError || !(availability as {online_enabled:boolean}[]|null)?.[0]?.online_enabled){
     return {error:"Esta conta não está autorizada a criar cobranças Sandbox. Solicite acesso temporário ao administrador."};
    }
   }
   if(!gateway.webhookConfigured)return{error:"Configure a confirmação automática no painel antes de aceitar pagamentos."};
   if(order.asaas_checkout_id){
    if(order.asaas_checkout_state!=="active")return{error:"Cobrança anterior não está ativa. Consulte a loja."};
    return{checkoutUrl:order.asaas_checkout_url??asaasCheckoutLink(order.asaas_checkout_id,gateway.mode)};
   }
   const returnUrl=paymentReturnUrl(getSiteUrl(),order.id);
   const claimed=await backendRpc<boolean>("backend_claim_checkout",{_order_id:order.id,_user_id:context.userId});
   if(!claimed)return{error:"A cobrança está sendo preparada ou requer verificação. Não pague novamente."};
   try{
    const checkout=asaasCheckoutSchema.parse(await asaasApiRequest(gateway.apiKey,gateway.mode,"/checkouts",{
     billingTypes:["PIX","CREDIT_CARD"],chargeTypes:["DETACHED"],minutesToExpire:60,externalReference:order.id,
     callback:{successUrl:returnUrl,cancelUrl:returnUrl,expiredUrl:returnUrl},
     items:[{name:`Pedido Crazy #${order.code}`.slice(0,30),description:"Produtos e entrega",quantity:1,value:Number(order.total)}],
    }));
    const url=asaasCheckoutLink(checkout.id,gateway.mode);
    const saved=await backendRpc<boolean>("backend_save_checkout",{_order_id:order.id,_checkout_id:checkout.id,_url:url});
    if(!saved)throw new Error("Cobrança gerada mas não registrada; consulte a loja.");
    return{checkoutUrl:url};
   }catch(e){
    const definitive=e instanceof AsaasApiError&&e.status===400;
    await backendRpc("backend_checkout_failure",{_order_id:order.id,_definitive:definitive});
    return{error:definitive&&e instanceof Error?e.message:"Falha ao registrar a cobrança. Consulte a loja antes de tentar novamente."};
   }
  }catch(e){
   return{error:e instanceof Error?e.message:"Pagamento indisponível"};
  }
 });
