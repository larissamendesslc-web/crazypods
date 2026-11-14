/**
 * Server-only read-only subtotal preview.
 * Reads current prices from the EXISTING public.products table.
 * Does not authorize sale, reserve stock, charge, or create an order.
 */
import { createClient } from "@supabase/supabase-js";
import { calculateCurrentSubtotal } from "./payment-amounts";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export async function readOnlySubtotalHandler(request: Request) {
  if (request.method !== "POST") return response({ error: "Método não permitido." }, 405);
  const url = process.env["CHECKOUT_DB_URL"];
  const token = process.env["CHECKOUT_DB_SERVICE_KEY"];
  if (!url || !token) return response({ error: "Validação no servidor aguardando conexão com o banco da loja." }, 503);
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url))
    return response({ error: "Configuração de banco inválida." }, 503);
  const len = Number(request.headers.get("content-length") ?? "0");
  if (len > 16_000) return response({ error: "Requisição muito grande." }, 413);
  let data: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 16_000) return response({ error: "Requisição muito grande." }, 413);
    data = JSON.parse(raw);
  } catch {
    return response({ error: "Solicitação inválida." }, 400);
  }
  if (!data || typeof data !== "object" || Array.isArray(data))
    return response({ error: "Solicitação inválida." }, 400);
  const items = (data as { items?: unknown }).items;
  if (!Array.isArray(items) || items.length === 0 || items.length > 80)
    return response({ error: "Itens de carrinho inválidos." }, 400);
  const ids = items.map((row: unknown) => row && typeof row === "object" ? (row as { product_id?: unknown }).product_id : null);
  if (ids.some(id => typeof id !== "string" || !/^[a-f0-9-]{36}$/i.test(id)))
    return response({ error: "Produto inválido." }, 400);
  const client = createClient(url, token, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: products, error } = await client
    .from("products").select("id,name,price,sold_out,flavors").in("id", [...new Set(ids as string[])]);
  if (error) return response({ error: "Não foi possível validar os preços neste momento." }, 503);
  const result = calculateCurrentSubtotal(items, products ?? []);
  if (!result.ok) return response({ error: result.reason }, 409);
  return response({
    currency: "BRL",
    lines: result.lines,
    subtotalCents: result.subtotalCents,
    shippingCents: null,
    totalCents: null,
    note: "Cotação preliminar. Frete e pagamento final dependem de pedido verificado no servidor.",
  });
}

export function paymentMethodsStatus() {
  const providerConfigured = !!process.env["MERCADOPAGO_ACCESS_TOKEN"] &&
    !!process.env["MERCADOPAGO_WEBHOOK_SECRET"];
  // This release intentionally has NO live-charge endpoint.
  // Future release MUST require a merchant-approved, stock-reserved server order.
  return {
    checkoutLive: false,
    providerConfigured,
    methods: [
      { id: "pix", provider: "mercadopago", available: false },
      { id: "card", provider: "mercadopago", available: false },
      { id: "cash", provider: "store", available: false },
    ],
    message: "Métodos preparados, cobranças aguardando validação do banco e aprovação da conta recebedora.",
  };
}
