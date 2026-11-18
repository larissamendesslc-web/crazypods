import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

type SandboxTester = {user_id:string;email:string;permitted_until:string};
import { connectAsaasAccount, configureAsaasWebhook, getAsaasIntegrationStatus, verifyAsaasConnection } from "@/utils/asaas-settings.functions";

export const Route=createFileRoute("/admin/pagamentos")({
 head:()=>({meta:[{title:"Pagamentos Asaas — Crazy"},{name:"robots",content:"noindex,nofollow"}]}),
 component:Payments,
});
function Payments(){
 const statusFn=useServerFn(getAsaasIntegrationStatus);
 const connectFn=useServerFn(connectAsaasAccount);
 const webhookFn=useServerFn(configureAsaasWebhook);
 const verifyFn=useServerFn(verifyAsaasConnection);
 const [status,setStatus]=useState<{connected:boolean;mode:"sandbox"|"live"|null;webhook_configured:boolean}|null>(null);
 const [busy,setBusy]=useState(false);
 const [apiKey,setApiKey]=useState("");
 const [email,setEmail]=useState("");
 const [mode,setMode]=useState<"sandbox"|"live">("sandbox");
 const [message,setMessage]=useState("");
 const [testEmail,setTestEmail]=useState("");
 const [testers,setTesters]=useState<SandboxTester[]>([]);
 const [testerBusy,setTesterBusy]=useState(false);
 useEffect(()=>{
  let active=true;
  statusFn().then(s=>{if(active)setStatus(s)}).catch(()=>{if(active)setMessage("Não foi possível consultar a integração.")});
  return()=>{active=false};
 },[statusFn]);
 async function connect(){
  if(!apiKey.trim()||!email.trim())return;
  setBusy(true);setMessage("");
  try{
   const r=await connectFn({data:{apiKey:apiKey.trim(),notificationEmail:email.trim(),mode}});
   setApiKey("");
   setStatus({connected:true,mode:r.mode,webhook_configured:r.webhookConfigured});
   setMessage(r.message);
  }catch(e){setMessage(e instanceof Error?e.message:"Falha ao conectar Asaas")}
  finally{setBusy(false)}
 }
 async function verify(){
  setBusy(true);setMessage("");
  try{const r=await verifyFn();setStatus({connected:true,mode:r.mode,webhook_configured:r.webhookConfigured});setMessage("A chave Asaas está válida.")}
  catch(e){setMessage(e instanceof Error?e.message:"Falha na verificação")}
  finally{setBusy(false)}
 }
 async function reconfigure(){
  if(!email.trim())return;
  setBusy(true);setMessage("");
  try{const r=await webhookFn({data:{notificationEmail:email.trim()}});setMessage(r.message);setStatus(s=>s?{...s,webhook_configured:true}:s)}
  catch(e){setMessage(e instanceof Error?e.message:"Falha no webhook")}
  finally{setBusy(false)}
 }
 async function reloadTesters(){
  const {data,error}=await supabase.rpc("admin_list_sandbox_testers" as never);
  if(error)throw error;
  setTesters((data??[]) as SandboxTester[]);
 }
 useEffect(()=>{
  if(!status?.connected || status.mode!=="sandbox"){setTesters([]);return;}
  let active=true;
  supabase.rpc("admin_list_sandbox_testers" as never).then(({data,error})=>{
   if(active && !error)setTesters((data??[]) as SandboxTester[]);
  });
  return()=>{active=false};
 },[status?.connected,status?.mode]);
 async function authorizeTester(){
  if(!testEmail.trim())return;
  setTesterBusy(true);setMessage("");
  try{
   const {error}=await supabase.rpc("admin_add_sandbox_tester" as never,{_email:testEmail.trim()} as never);
   if(error)throw error;
   setTestEmail("");
   await reloadTesters();
   setMessage("Conta autorizada para pagamentos simulados pelas próximas 24 horas.");
  }catch(e){setMessage(e instanceof Error?e.message:"Não foi possível autorizar esta conta.")}
  finally{setTesterBusy(false)}
 }
 async function revokeTester(userId:string){
  setTesterBusy(true);setMessage("");
  try{
   const {error}=await supabase.rpc("admin_remove_sandbox_tester" as never,{_user_id:userId} as never);
   if(error)throw error;
   await reloadTesters();
   setMessage("Autorização de teste revogada.");
  }catch(e){setMessage(e instanceof Error?e.message:"Não foi possível revogar o teste.")}
  finally{setTesterBusy(false)}
 }
 return <section className="max-w-2xl space-y-6">
  <h1 className="font-display text-2xl font-bold">Pagamentos</h1>
  <div className="space-y-2 border-y py-5">
   <p className="font-bold">Asaas · Pix e cartão</p>
   <p className="text-sm text-muted-foreground">Conecte sua conta Asaas uma única vez. O sistema instala a confirmação automática dos pagamentos e mantém sua chave criptografada.</p>
   <p className="text-sm">{status===null?"Verificando conexão...":status.connected?
     status.webhook_configured?"✓ Conectado · confirmação automática ativa":"Conectado · confirmação pendente":"Asaas ainda não conectado"}</p>
   {status?.mode&&<p className="text-xs text-muted-foreground">Ambiente: {status.mode==="live"?"Produção · pagamentos reais":"Sandbox · somente testes"}</p>}
  </div>
  <div className="space-y-4">
   <div className="space-y-1.5"><Label htmlFor="gateway-mode">Ambiente</Label>
    <select id="gateway-mode" className="h-12 w-full rounded-xl border bg-background px-4" value={mode} onChange={e=>setMode(e.target.value as "sandbox"|"live")}>
     <option value="sandbox">Sandbox — pagamentos simulados</option>
     <option value="live">Produção — pagamentos reais</option>
    </select>
   </div>
   <div className="space-y-1.5"><Label htmlFor="gateway-key">Chave de API do Asaas</Label>
    <Input id="gateway-key" type="password" autoComplete="off" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="Cole sua chave da conta Asaas" className="h-12 rounded-xl"/>
   </div>
   <div className="space-y-1.5"><Label htmlFor="gateway-email">E-mail para notificações</Label>
    <Input id="gateway-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="contato@sualoja.com.br" className="h-12 rounded-xl"/>
   </div>
   <div className="flex flex-wrap gap-3">
    <Button disabled={busy||!apiKey.trim()||!email.trim()} onClick={()=>void connect()}>{busy?"Conectando...":"Conectar minha conta Asaas"}</Button>
    {status?.connected&&<Button disabled={busy} variant="outline" onClick={()=>void verify()}>Testar conexão</Button>}
    {status?.connected&&!status.webhook_configured&&<Button disabled={busy||!email.trim()} variant="outline" onClick={()=>void reconfigure()}>Configurar confirmação automática</Button>}
   </div>
   {mode==="live"&&<p className="text-xs text-muted-foreground">Produção gera cobranças reais após conectar conta habilitada pelo Asaas e confirmar o webhook.</p>}
   {message&&<p role="status" className="text-sm">{message}</p>}
   <p className="text-xs text-muted-foreground">A chave é criada no próprio Asaas, em Integrações → Chaves de API. Não envie chaves por mensagens.</p>
  </div>
  {status?.connected && status.mode==="sandbox" && (
    <section className="space-y-3 rounded-2xl border bg-card p-5">
      <h2 className="font-display text-lg font-bold">Contas autorizadas para testar</h2>
      <p className="text-sm text-muted-foreground">
        O Asaas está conectado em modo Sandbox. Por segurança, Pix e cartão simulados ficam disponíveis
        apenas para o administrador e para contas autorizadas aqui. A liberação expira em 24 horas.
      </p>
      <p className="text-xs text-muted-foreground">
        Primeiro, crie uma conta normal de cliente na loja. Depois informe o e-mail dela abaixo.
        Os pagamentos são fictícios, mas os pedidos de teste podem movimentar estoque e caixa.
      </p>
      <div className="flex flex-wrap gap-2">
        <Input aria-label="E-mail da conta de teste" type="email" autoComplete="off"
          placeholder="cliente-teste@exemplo.com" className="min-w-0 flex-1"
          value={testEmail} onChange={e=>setTestEmail(e.target.value)} />
        <Button disabled={testerBusy||!testEmail.trim()} onClick={()=>void authorizeTester()}>
          Autorizar por 24h
        </Button>
      </div>
      {testers.length>0 && (
        <div className="divide-y border-t">
          {testers.map(t=>(
            <div key={t.user_id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="break-all text-sm font-medium">{t.email}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(t.permitted_until).getTime()>Date.now() ? "Autorizado até" : "Expirou em"}
                  {" "}{new Date(t.permitted_until).toLocaleString("pt-BR")}
                </p>
              </div>
              <Button variant="outline" size="sm" disabled={testerBusy}
                onClick={()=>void revokeTester(t.user_id)}>Revogar</Button>
            </div>
          ))}
        </div>
      )}
    </section>
  )}
 </section>;
}
