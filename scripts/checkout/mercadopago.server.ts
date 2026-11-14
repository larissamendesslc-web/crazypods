/**
 * Provider adapter only — server-side, never loaded by the browser.
 * Checkout Pro supports Mercado Pago's enabled Pix and card methods.
 * Orders MUST be verified/approved/reserved before this adapter is called.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { calculateOrderTotal } from "./payment-amounts";

export type ApprovedOrder = {
  id: string;
  status: "reserved";
  currency: "BRL";
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  expiresAt: string;
  buyerEmail: string;
  saleAuthorizationId: string; // emitted by merchant's server review, not browser
  stockReservationId: string;
  lines: { productId: string; title: string; unitCents: number; quantity: number }[];
};
export type PaymentConfig = {
  accessToken: string;
  webhookSecret: string;
  publicOrigin: string;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Less strict UUID syntax (standard v4) for idempotent business keys.
const idPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

function origin(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !url.hostname ||
      url.pathname !== "/" || url.search || url.hash || url.username || url.password)
    throw new Error("É necessário configurar um domínio HTTPS válido.");
  return url.origin;
}
export function validateApprovedOrder(order: ApprovedOrder) {
  if (!idPattern.test(order.id) || order.status !== "reserved" || order.currency !== "BRL" ||
      !idPattern.test(order.saleAuthorizationId) || !idPattern.test(order.stockReservationId) ||
      !Number.isFinite(Date.parse(order.expiresAt)) || Date.parse(order.expiresAt) <= Date.now() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.buyerEmail) ||
      !Array.isArray(order.lines) || !order.lines.length || order.lines.length > 80) {
    throw new Error("Pedido não liberado para pagamento.");
  }
  let subtotal = 0;
  for (const line of order.lines) {
    if (!idPattern.test(line.productId) || !line.title.trim() || line.title.length > 220 ||
        !Number.isSafeInteger(line.unitCents) || line.unitCents < 1 ||
        !Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 100)
      throw new Error("Itens do pedido inválidos.");
    subtotal += line.unitCents * line.quantity;
  }
  if (subtotal !== order.subtotalCents ||
      calculateOrderTotal(order.subtotalCents, order.shippingCents) !== order.totalCents)
    throw new Error("Os totais do pedido não conferem.");
  return order;
}

export function buildCheckoutPreference(order: ApprovedOrder, publicOrigin: string) {
  validateApprovedOrder(order);
  const base = origin(publicOrigin);
  const items = order.lines.map(line => ({
    id: line.productId,
    title: line.title,
    quantity: line.quantity,
    currency_id: "BRL",
    unit_price: line.unitCents / 100,
  }));
  if (order.shippingCents > 0) items.push({
    id: "delivery", title: "Entrega", quantity: 1,
    currency_id: "BRL", unit_price: order.shippingCents / 100,
  });
  return {
    items,
    external_reference: order.id,
    payer: { email: order.buyerEmail },
    back_urls: {
      success: base + "/",
      pending: base + "/",
      failure: base + "/",
    },
    notification_url: base + "/api/checkout/mp-webhook",
    expires: true,
    expiration_date_to: new Date(order.expiresAt).toISOString(),
    auto_return: "approved",
  };
}

export async function createHostedCheckout(
  config: PaymentConfig,
  order: ApprovedOrder,
  fetcher: typeof fetch = fetch,
) {
  if (!config.accessToken || config.accessToken.length < 24 ||
      !config.webhookSecret || config.webhookSecret.length < 20)
    throw new Error("Pagamento não configurado no servidor.");
  const payload = buildCheckoutPreference(order, config.publicOrigin);
  const response = await fetcher("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + config.accessToken,
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Idempotency-Key": order.id,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("Não foi possível iniciar o checkout no provedor.");
  const data: unknown = await response.json();
  if (!data || typeof data !== "object") throw new Error("Resposta inválida do provedor.");
  const raw = data as { id?: unknown; init_point?: unknown; sandbox_init_point?: unknown };
  const initPoint = typeof raw.init_point === "string" ? raw.init_point : "";
  const parsed = new URL(initPoint);
  if (parsed.protocol !== "https:" ||
      !/(^|\.)mercadopago\.com\.br$/.test(parsed.hostname) ||
      typeof raw.id !== "string" || !raw.id) {
    throw new Error("Link retornado pelo provedor não foi reconhecido.");
  }
  return { preferenceId: raw.id, redirectUrl: parsed.toString() };
}

export function validateMercadoPagoSignature(args: {
  signature: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string;
  now?: number;
}): boolean {
  const { signature, requestId, dataId, secret, now = Date.now() } = args;
  if (!signature || !requestId || !dataId || !secret ||
      !/^[a-z0-9_-]{3,150}$/i.test(requestId) ||
      !/^\d{1,25}$/.test(dataId)) return false;
  const parts = Object.fromEntries(signature.split(",").map(part => part.trim().split("=", 2)));
  if (!/^\d{12,14}$/.test(parts.ts ?? "") ||
      !/^[a-f0-9]{64}$/i.test(parts.v1 ?? "") ||
      Math.abs(now - Number(parts.ts)) > 10 * 60_000) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest();
  const provided = Buffer.from(parts.v1, "hex");
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
