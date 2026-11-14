import { createHmac } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createPixCharge, fetchMercadoPagoPayment, paymentOrderPayload,
  verifyMercadoPagoWebhook,
} from "./mercadopago.server.ts";

const orderId = "8c9c5e27-f57c-4334-81da-3afba47c20dd";
const config = {
  accessToken: "APP_USR_EXAMPLE_ONLY_DO_NOT_USE_TEST_TOKEN_12345",
  webhookSecret: "example-verified-secret-value-only-not-real",
  baseUrl: "https://crazypods.vercel.app",
};
const validOrder = () => ({
  id: orderId, amountCents: 8990,
  payerEmail: "buyer@example.org", description: "Fone sem fio",
  expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
});

test("pix payload is created from trusted order cents, not client amount", () => {
  const payload = paymentOrderPayload(validOrder(), config.baseUrl);
  assert.equal(payload.transaction_amount, 89.9);
  assert.equal(payload.payment_method_id, "pix");
  assert.equal(payload.external_reference, orderId);
  assert.equal(payload.notification_url, config.baseUrl + "/api/commerce/mp-webhook");
});

test("invalid amount, expired quote and non-https origin are rejected", () => {
  assert.throws(() => paymentOrderPayload({ ...validOrder(), amountCents: -1 }, config.baseUrl));
  assert.throws(() => paymentOrderPayload({
    ...validOrder(), expiresAt: "2000-01-01T00:00:00Z",
  }, config.baseUrl));
  assert.throws(() => paymentOrderPayload(validOrder(), "http://example.com"));
});

test("Pix HTTP request uses bearer token and idempotency by verified order", async () => {
  let sent = null;
  const mock = async (url, options) => {
    sent = { url, options };
    return {
      ok: true,
      json: async () => ({
        id: 12345678, status: "pending", external_reference: orderId,
        point_of_interaction: {
          transaction_data: { qr_code: "000201PIX-COPY", qr_code_base64: "base64" },
        },
      }),
    };
  };
  const charge = await createPixCharge(config, validOrder(), mock);
  assert.equal(sent.url, "https://api.mercadopago.com/v1/payments");
  assert.equal(sent.options.headers["X-Idempotency-Key"], orderId);
  assert.equal(sent.options.headers.Authorization, "Bearer " + config.accessToken);
  assert.equal(charge.copyPaste, "000201PIX-COPY");
});

test("webhook authentic HMAC must match full manifest and fresh timestamp", () => {
  const ts = String(Date.now());
  const requestId = "req-1234-abc";
  const dataId = "12345678";
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const signature = createHmac("sha256", config.webhookSecret).update(manifest).digest("hex");
  const args = { dataId, requestId, secret: config.webhookSecret,
    signature: `ts=${ts},v1=${signature}` };
  assert.equal(verifyMercadoPagoWebhook(args), true);
  assert.equal(verifyMercadoPagoWebhook({ ...args, dataId: "12345679" }), false);
  assert.equal(verifyMercadoPagoWebhook({ ...args, requestId: "req-falsified" }), false);
  assert.equal(verifyMercadoPagoWebhook({ ...args, now: Number(ts) + 700000 }), false);
});

test("server reads payment status from remote provider and checks ID", async () => {
  const response = async () => ({
    ok: true,
    json: async () => ({ id: 12345678, status: "approved",
      status_detail: "accredited", external_reference: orderId, transaction_amount: 89.9 }),
  });
  const result = await fetchMercadoPagoPayment(config.accessToken, "12345678", response);
  assert.equal(result.status, "approved");
  assert.equal(result.amountCents, 8990);
  assert.equal(result.externalReference, orderId);
});
