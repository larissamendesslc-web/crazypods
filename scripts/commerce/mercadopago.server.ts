/**
 * Mercado Pago Pix server-only adapter. No browser import allowed.
 *
 * IMPORTANT: A payment can only be created for an existing server-validated
 * order and an authorized, sellable product. NEVER accept price/total from UI.
 *
 * Official docs: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-payments/integration-configuration/integrate-pix
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const apiBase = "https://api.mercadopago.com";
const maxCents = 100_000_000;

export type AuthorizedPaymentOrder = {
  id: string;
  amountCents: number;
  payerEmail: string;
  description: string;
  expiresAt: string;
};
export type PixCharge = {
  paymentId: string;
  status: string;
  copyPaste: string | null;
  qrCodeBase64: string | null;
  externalReference: string;
};
export type MercadoPagoConfig = {
  accessToken: string;
  webhookSecret: string;
  baseUrl: string;
};
export type RemotePayment = {
  id: string;
  status: string;
  statusDetail: string;
  externalReference: string;
  amountCents: number;
};

function isUuid(input: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input);
}
function validateBaseUrl(input: string) {
  const url = new URL(input);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash)
    throw new Error("O endereço público do gateway precisa ser HTTPS.");
  return url.origin;
}
export function validateConfig(config: MercadoPagoConfig) {
  if (!config.accessToken || config.accessToken.length < 30)
    throw new Error("Credencial privada do Mercado Pago ausente.");
  if (!config.webhookSecret || config.webhookSecret.length < 20)
    throw new Error("Segredo do webhook ausente.");
  return validateBaseUrl(config.baseUrl);
}
export function paymentOrderPayload(order: AuthorizedPaymentOrder, baseUrl: string) {
  if (!isUuid(order.id) || !Number.isSafeInteger(order.amountCents) ||
    order.amountCents < 100 || order.amountCents > maxCents ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.payerEmail) ||
    !order.description.trim() || order.description.length > 256 ||
    !Number.isFinite(Date.parse(order.expiresAt)) ||
    Date.parse(order.expiresAt) <= Date.now()) {
    throw new Error("Pedido não autorizado ou dados de pagamento inválidos.");
  }
  return {
    transaction_amount: order.amountCents / 100,
    description: order.description,
    payment_method_id: "pix",
    payer: { email: order.payerEmail },
    external_reference: order.id,
    date_of_expiration: new Date(order.expiresAt).toISOString(),
    notification_url: validateBaseUrl(baseUrl) + "/api/commerce/mp-webhook",
  };
}

export async function createPixCharge(
  config: MercadoPagoConfig,
  order: AuthorizedPaymentOrder,
  fetcher: typeof fetch = fetch,
): Promise<PixCharge> {
  const baseUrl = validateConfig(config);
  const payload = paymentOrderPayload(order, baseUrl);
  const response = await fetcher(apiBase + "/v1/payments", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + config.accessToken,
      Accept: "application/json",
      "Content-Type": "application/json",
      // Stable server-owned UUID: retries for the same order cannot issue duplicates.
      "X-Idempotency-Key": order.id,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    throw new Error("O provedor de pagamentos recusou a solicitação. Confira a integração.");
  }
  const data: unknown = await response.json();
  if (!data || typeof data !== "object") throw new Error("Retorno inválido do provedor.");
  const parsed = data as {
    id?: unknown; status?: unknown; external_reference?: unknown;
    point_of_interaction?: { transaction_data?: { qr_code?: unknown; qr_code_base64?: unknown } };
  };
  if (!["string", "number"].includes(typeof parsed.id) ||
    typeof parsed.status !== "string" || parsed.external_reference !== order.id) {
    throw new Error("Confirmação do provedor inconsistente com o pedido.");
  }
  const qr = parsed.point_of_interaction?.transaction_data;
  return {
    paymentId: String(parsed.id),
    status: parsed.status,
    copyPaste: typeof qr?.qr_code === "string" ? qr.qr_code : null,
    qrCodeBase64: typeof qr?.qr_code_base64 === "string" ? qr.qr_code_base64 : null,
    externalReference: order.id,
  };
}

export async function fetchMercadoPagoPayment(
  accessToken: string, paymentId: string, fetcher: typeof fetch = fetch,
): Promise<RemotePayment> {
  if (!/^\d{1,25}$/.test(paymentId)) throw new Error("Identificador de pagamento inválido.");
  if (!accessToken || accessToken.length < 30) throw new Error("Integração não configurada.");
  const response = await fetcher(apiBase + "/v1/payments/" + paymentId, {
    method: "GET",
    headers: { Authorization: "Bearer " + accessToken, Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("Não foi possível consultar o pagamento no provedor.");
  const data: unknown = await response.json();
  if (!data || typeof data !== "object") throw new Error("Pagamento inválido.");
  const row = data as {
    id?: unknown; status?: unknown; status_detail?: unknown;
    external_reference?: unknown; transaction_amount?: unknown;
  };
  const amount = typeof row.transaction_amount === "number"
    ? Math.round(row.transaction_amount * 100) : Number.NaN;
  if (String(row.id) !== paymentId || typeof row.status !== "string" ||
    typeof row.external_reference !== "string" || !Number.isSafeInteger(amount))
    throw new Error("Dados de pagamento inconsistentes.");
  return {
    id: paymentId, status: row.status,
    statusDetail: typeof row.status_detail === "string" ? row.status_detail : "",
    externalReference: row.external_reference, amountCents: amount,
  };
}

/** Timing-safe HMAC verification for the exact, documented MP webhook manifest. */
export function verifyMercadoPagoWebhook(args: {
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
  const parameters = Object.fromEntries(signature.split(",").map(part => part.trim().split("=", 2)));
  const ts = parameters.ts;
  const hash = parameters.v1;
  if (!ts || !hash || !/^\d{12,14}$/.test(ts) || !/^[a-f0-9]{64}$/i.test(hash))
    return false;
  if (Math.abs(now - Number(ts)) > 10 * 60 * 1000) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest();
  const actual = Buffer.from(hash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
