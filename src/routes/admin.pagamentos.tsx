import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { checkAsaasConnection, configureAsaasWebhook } from "@/utils/asaas-settings.functions";

export const Route = createFileRoute("/admin/pagamentos")({ head: () => ({ meta: [
  { title: "Pagamentos Asaas — Crazy" }, { name: "description", content: "Configuração de pagamentos e confirmações Asaas da Crazy." },
  { property: "og:title", content: "Pagamentos Asaas — Crazy" }, { property: "og:description", content: "Configuração dos pagamentos da Crazy." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
] }), component: Payments });

function Payments() {
  const check = useServerFn(checkAsaasConnection);
  const configure = useServerFn(configureAsaasWebhook);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState(false);

  async function test() {
    setBusy(true); setMessage("");
    try {
      const result = await check();
      setConnected(result.connected);
      setMessage(result.serverReady
        ? `Asaas ${result.environment} conectado. ${result.webhookConfigured ? "Webhook encontrado." : "Webhook ainda não configurado."}`
        : "Chave Sandbox validada. A confirmação de pedidos ainda depende das credenciais do servidor Supabase.");
    } catch (error) {
      setConnected(false);
      setMessage(error instanceof Error ? error.message : "Não foi possível testar a conexão.");
    } finally { setBusy(false); }
  }

  async function setup() {
    setBusy(true); setMessage("");
    try {
      const result = await configure({ data: { preview: false } });
      setMessage(result.message);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível configurar o webhook."); }
    finally { setBusy(false); }
  }

  return <section className="max-w-2xl space-y-6">
    <h1 className="font-display text-2xl font-bold">Pagamentos</h1>
    <div className="border-y py-5">
      <p className="font-bold">Asaas · Sandbox</p>
      <p className="mt-2 text-sm text-muted-foreground">Somente testes. Nenhuma cobrança real está habilitada.</p>
      <p className="mt-2 text-sm text-muted-foreground">Crie sua chave de Sandbox no painel do Asaas e salve-a na Vercel como <code>ASAAS_SANDBOX_API_KEY</code>. A chave nunca deve ser colocada no código do site. Depois clique em Testar conexão.</p>
    </div>
    <div className="flex flex-wrap gap-3">
      <Button disabled={busy} onClick={() => void test()}>{busy ? "Verificando..." : "Testar conexão Asaas"}</Button>
      <Button disabled={busy || !connected} variant="outline" onClick={() => void setup()}>Configurar webhook automático</Button>
    </div>
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
