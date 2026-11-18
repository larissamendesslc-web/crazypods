import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import { z } from "zod";
import { verifiedOrderPayment } from "@/lib/payment-confirmation";
import { AsaasError, asaasRequest, findPaidAsaasPayment } from "@/lib/asaas.server";
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
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error: confirmError } = await supabaseAdmin.rpc("confirm_online_payment", { _order_id: order.id, _paid: true, _ref: `asaas:sandbox:${order.asaas_checkout_id}` });
        if (confirmError) throw confirmError;
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

// Asaas does not document create-checkout idempotency. Claim creation atomically;
// an ambiguous timeout remains locked until reconciled, never silently retried.
export const createOrderCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ orderId: z.string().uuid(), origin: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase.from("orders").select("id,user_id,code,total,status,payment_method,payment_ref,asaas_checkout_id,asaas_checkout_url,asaas_checkout_state").eq("id", data.orderId).eq("user_id", context.userId).maybeSingle();
    if (error || !order) return { error: "Pedido não encontrado" };
    if (order.status !== "pendente" || order.payment_method !== "online") return { error: "Este pedido não aguarda pagamento" };
    if (order.payment_ref?.startsWith("cs_")) return { error: "Este pedido já tem cobrança Stripe. Verifique o pagamento antes de criar outro pedido." };
    if (order.asaas_checkout_id) {
      if (order.asaas_checkout_state !== "active") return { error: "Esta cobrança não está disponível. Verifique o pagamento ou consulte a loja." };
      return { checkoutUrl: order.asaas_checkout_url ?? asaasCheckoutLink(order.asaas_checkout_id) };
    }
    const returnUrl = paymentReturnUrl(data.origin, order.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: claim, error: claimError } = await supabaseAdmin.from("orders").update({ asaas_checkout_state: "creating", asaas_creation_started_at: new Date().toISOString() }).eq("id", order.id).eq("status", "pendente").is("asaas_checkout_state", null).select("id").maybeSingle();
    if (claimError || !claim) return { error: "A cobrança está sendo preparada ou precisa de verificação. Não pague novamente; consulte a loja." };
    try {
      const checkout = asaasCheckoutSchema.parse(await asaasRequest("/checkouts", {
        billingTypes: ["PIX", "CREDIT_CARD"], chargeTypes: ["DETACHED"], minutesToExpire: 60,
        externalReference: order.id,
        callback: { successUrl: returnUrl, cancelUrl: returnUrl, expiredUrl: returnUrl },
        items: [{ name: `Pedido Crazy #${order.code}`.slice(0, 30), description: "Produtos e entrega", quantity: 1, value: Number(order.total) }],
      }));
      const checkoutUrl = asaasCheckoutLink(checkout.id);
      const { error: saveError } = await supabaseAdmin.from("orders").update({ asaas_checkout_id: checkout.id, asaas_checkout_url: checkoutUrl, asaas_checkout_state: "active", payment_ref: `asaas:sandbox:${checkout.id}` }).eq("id", order.id).eq("asaas_checkout_state", "creating");
      if (saveError) throw saveError;
      return { checkoutUrl };
    } catch (e) {
      const definitive = e instanceof AsaasError && e.status === 400;
      await supabaseAdmin.from("orders").update({ asaas_checkout_state: definitive ? null : "uncertain" }).eq("id", order.id).eq("asaas_checkout_state", "creating");
      return { error: definitive && e instanceof Error ? e.message : "Não foi possível confirmar a criação da cobrança. Consulte a loja antes de tentar novamente." };
    }
  });