import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { asaasApiRequest, backendRpc, encryptGatewaySecret, getGateway, getSiteUrl } from "@/lib/gateway.server";
import { randomBytes } from "node:crypto";
import { z } from "zod";

const inputSchema=z.object({
  mode:z.enum(["sandbox","live"]),
  apiKey:z.string().trim().min(20).max(500),
  notificationEmail:z.string().trim().email(),
});
const webhookEvents=["CHECKOUT_PAID","CHECKOUT_CANCELED","CHECKOUT_EXPIRED","PAYMENT_RECEIVED","PAYMENT_CONFIRMED"];
async function ensureAdmin(context:{supabase:any;userId:string}){
  const {data,error}=await context.supabase.rpc("has_role",{_user_id:context.userId,_role:"admin"});
  if(error||!data)throw new Error("Somente administrador pode integrar pagamentos");
}
async function installWebhook(email:string){
  const gateway=await getGateway();
  const url=getSiteUrl()+"/api/public/payments/asaas-webhook";
  const probe=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}",signal:AbortSignal.timeout(15000)});
  if(probe.status!==401)throw new Error("Endpoint de confirmação não está pronto para receber eventos");
  const list=z.object({data:z.array(z.object({id:z.string(),url:z.string()}))}).parse(
    await asaasApiRequest(gateway.apiKey,gateway.mode,"/webhooks?limit=100"));
  const existing=list.data.find(h=>h.url===url);
  const body={
    name:"Confirmação automática da loja",url,email,enabled:true,interrupted:false,
    apiVersion:3,authToken:gateway.webhookToken,sendType:"SEQUENTIALLY",events:webhookEvents,
  };
  const hook=z.object({id:z.string()}).parse(
    await asaasApiRequest(gateway.apiKey,gateway.mode,
      existing?`/webhooks/${encodeURIComponent(existing.id)}`:"/webhooks",
      body,existing?"PUT":"POST"));
  await backendRpc("backend_mark_webhook",{_webhook_id:hook.id});
}
export const getAsaasIntegrationStatus=createServerFn({method:"POST"})
 .middleware([requireSupabaseAuth])
 .handler(async({context})=>{
  await ensureAdmin(context);
  const {data,error}=await context.supabase.rpc("admin_payment_status" as never);
  if(error)throw new Error("Falha na consulta de integração");
  return ((data as any)?.[0]??{connected:false,mode:null,webhook_configured:false,configured_at:null}) as
   {connected:boolean;mode:"sandbox"|"live"|null;webhook_configured:boolean;configured_at:string|null};
 });
export const connectAsaasAccount=createServerFn({method:"POST"})
 .middleware([requireSupabaseAuth])
 .validator((input:unknown)=>inputSchema.parse(input))
 .handler(async({data,context})=>{
  await ensureAdmin(context);
  await asaasApiRequest(data.apiKey,data.mode,"/myAccount/status");
  const hookSecret=randomBytes(48).toString("base64url");
  const {error}=await context.supabase.rpc("admin_save_gateway" as never,{
    _mode:data.mode,
    _key_ciphertext:encryptGatewaySecret(data.apiKey),
    _webhook_ciphertext:encryptGatewaySecret(hookSecret),
  } as never);
  if(error)throw new Error("A conexão foi validada, mas não foi possível salvar os dados protegidos");
  try{
    await installWebhook(data.notificationEmail);
    return {connected:true,webhookConfigured:true,mode:data.mode,message:"Asaas conectado e confirmação automática configurada."};
  }catch(e){
    return {connected:true,webhookConfigured:false,mode:data.mode,
      message:"Asaas conectado. Falta concluir o webhook: "+(e instanceof Error?e.message:"erro")};
  }
 });
export const configureAsaasWebhook=createServerFn({method:"POST"})
 .middleware([requireSupabaseAuth])
 .validator((input:unknown)=>z.object({notificationEmail:z.string().trim().email()}).parse(input))
 .handler(async({data,context})=>{
  await ensureAdmin(context);
  await installWebhook(data.notificationEmail);
  return {configured:true,message:"Webhook configurado e testado."};
 });
export const verifyAsaasConnection=createServerFn({method:"POST"})
 .middleware([requireSupabaseAuth])
 .handler(async({context})=>{
  await ensureAdmin(context);
  const gateway=await getGateway();
  await asaasApiRequest(gateway.apiKey,gateway.mode,"/myAccount/status");
  return {connected:true,mode:gateway.mode,webhookConfigured:gateway.webhookConfigured};
 });
