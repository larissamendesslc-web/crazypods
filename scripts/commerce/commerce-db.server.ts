/**
 * Exclusively executed inside TanStack Start server routes.
 * SUPABASE_SECRET_KEY (or legacy service_role) must NEVER be prefixed by VITE_.
 */
import { createClient } from "@supabase/supabase-js";

export function commerceBackendReady() {
  return Boolean(process.env["COMMERCE_SUPABASE_URL"] &&
    process.env["COMMERCE_SUPABASE_SERVICE_ROLE_KEY"] &&
    process.env["COMMERCE_PAYMENTS_ENABLED"] === "1" &&
    process.env["MERCADOPAGO_ACCESS_TOKEN"] &&
    process.env["MERCADOPAGO_WEBHOOK_SECRET"] &&
    process.env["COMMERCE_PUBLIC_ORIGIN"]);
}

export function commerceDb() {
  const url = process.env["COMMERCE_SUPABASE_URL"];
  const key = process.env["COMMERCE_SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key || !/^https:\/\/[^\s]+\.supabase\.co\/?$/.test(url))
    throw new Error("Banco oficial de comércio não configurado.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, private",
    "X-Content-Type-Options": "nosniff",
  },
});

export async function limitedJson(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > 16000) throw new Error("Requisição excede o tamanho permitido.");
  const raw = await request.text();
  if (raw.length > 16000) throw new Error("Requisição excede o tamanho permitido.");
  return JSON.parse(raw);
}
