import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { asaasRequest } from "@/lib/asaas.server";
import { z } from "zod";

const WEBHOOK_URL = "https://crazypods.vercel.app/api/public/payments/asaas-webhook";

export const checkAsaasConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (error || !admin) throw new Error("Acesso restrito");
    const response = z.object({
      data: z.array(z.object({ id: z.string(), url: z.string() })),
    }).parse(await asaasRequest("/webhooks?limit=100"));
    return {
      connected: true,
      environment: "sandbox" as const,
      webhookConfigured: response.data.some((hook) => hook.url === WEBHOOK_URL),
      serverReady: Boolean(process.env["SUPABASE_SERVICE_ROLE_KEY"] && process.env["ASAAS_TEST_WEBHOOK_TOKEN"]),
    };
  });

export const configureAsaasWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ preview: z.boolean().optional() }).parse(input))
  .handler(async ({ context }) => {
    const { data: admin, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (error || !admin) throw new Error("Acesso restrito");

    const token = process.env["ASAAS_TEST_WEBHOOK_TOKEN"];
    if (!token || token.length < 32) throw new Error("Token de webhook não configurado na Vercel");
    if (!process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      throw new Error("Configure SUPABASE_SERVICE_ROLE_KEY na Vercel antes de ativar a confirmação dos pedidos.");
    }

    const { data: auth } = await context.supabase.auth.getUser();
    if (!auth.user?.email) throw new Error("E-mail do administrador indisponível");

    // Only allow the known production callback, never a browser-supplied URL.
    const probe = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(15000),
    });
    if (probe.status !== 401) {
      throw new Error("O endpoint de confirmação ainda não está pronto; não ative pagamentos.");
    }

    const list = z.object({
      data: z.array(z.object({ id: z.string(), url: z.string() })),
    }).parse(await asaasRequest("/webhooks?limit=100"));
    if (list.data.some((hook) => hook.url === WEBHOOK_URL)) {
      return { configured: true, existing: true, message: "Webhook existente: confira se o token coincide no Asaas." };
    }

    await asaasRequest("/webhooks", {
      name: "Crazy pagamentos sandbox",
      url: WEBHOOK_URL,
      email: auth.user.email,
      enabled: true,
      interrupted: false,
      apiVersion: 3,
      authToken: token,
      sendType: "SEQUENTIALLY",
      events: ["CHECKOUT_PAID", "CHECKOUT_CANCELED", "CHECKOUT_EXPIRED", "PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"],
    });
    return { configured: true, existing: false, message: "Webhook Sandbox criado e protegido." };
  });
