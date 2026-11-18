import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { asaasRequest } from "@/lib/asaas.server";
import { z } from "zod";

export const configureAsaasWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ preview: z.boolean() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: admin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || !admin) throw new Error("Acesso restrito");
    const token = process.env['ASAAS_TEST_WEBHOOK_TOKEN'];
    if (!token) throw new Error("Salve o segredo de confirmação no formulário seguro primeiro.");
    const { data: auth } = await context.supabase.auth.getUser();
    if (!auth.user?.email) throw new Error("E-mail do administrador indisponível");
    const base = data.preview ? "https://project--12827ac0-438c-42ab-8df6-40550c5cd1fd-dev.lovable.app" : "https://flavor-flock-market.lovable.app";
    const url = `${base}/api/public/payments/asaas-webhook`;
    const probe = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    if (probe.status !== 401) throw new Error("Publique esta versão antes de configurar a confirmação do site publicado.");
    const list = z.object({ data: z.array(z.object({ id: z.string(), url: z.string() })) }).parse(await asaasRequest("/webhooks?limit=100"));
    if (list.data.some((hook) => hook.url === url)) return { configured: true };
    await asaasRequest("/webhooks", { name: data.preview ? "Crazy teste prévia" : "Crazy teste publicado", url, email: auth.user.email,
      enabled: true, interrupted: false, apiVersion: 3, authToken: token, sendType: "SEQUENTIALLY",
      events: ["CHECKOUT_PAID", "CHECKOUT_CANCELED", "CHECKOUT_EXPIRED", "PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"] });
    return { configured: true };
  });