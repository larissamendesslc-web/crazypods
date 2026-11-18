import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { configureAsaasWebhook } from "@/utils/asaas-settings.functions";

export const Route = createFileRoute("/admin/pagamentos")({ head: () => ({ meta: [
  { title: "Pagamentos Asaas — Crazy" }, { name: "description", content: "Configuração de pagamentos e confirmações Asaas da Crazy." },
  { property: "og:title", content: "Pagamentos Asaas — Crazy" }, { property: "og:description", content: "Configuração dos pagamentos da Crazy." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
] }), component: Payments });
function Payments() {
  const configure = useServerFn(configureAsaasWebhook);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function setup(preview: boolean) {
    setBusy(true); setMessage("");
    try { await configure({ data: { preview } }); setMessage("Confirmação automática configurada."); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Não foi possível configurar."); }
    finally { setBusy(false); }
  }
  return <section className="max-w-2xl space-y-6">
    <h1 className="font-display text-2xl font-bold">Pagamentos</h1>
    <div className="border-y py-5"><p className="font-bold">Asaas · teste</p><p className="mt-2 text-sm text-muted-foreground">Cobranças reais desativadas.</p></div>
    <div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={() => void setup(true)}>Configurar confirmação da prévia</Button><Button disabled={busy} variant="outline" onClick={() => void setup(false)}>Configurar confirmação do site publicado</Button></div>
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}