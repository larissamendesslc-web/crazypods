import { expect, it } from "vitest";
import { matchesOrderPayment, verifiedOrderPayment, type PaymentSession } from "./payment-confirmation";
const order = { id: "order-1", user_id: "user-1", total: 97.13 };
const paid: PaymentSession = { mode: "payment", status: "complete", payment_status: "paid", client_reference_id: order.id, currency: "brl", amount_total: 9713, livemode: false, metadata: { order_id: order.id, userId: order.user_id } };
it("confirma somente aprovação da Stripe com total de R$97,13", () => {
  expect(verifiedOrderPayment(paid, order, false)).toBe(true);
  expect(verifiedOrderPayment({ ...paid, payment_status: "unpaid" }, order, false)).toBe(false);
  expect(verifiedOrderPayment({ ...paid, status: "open" }, order, false)).toBe(false);
  expect(verifiedOrderPayment({ ...paid, amount_total: 9712 }, order, false)).toBe(false);
});
it("recusa outro pedido, cliente, moeda e ambiente", () => {
  expect(verifiedOrderPayment({ ...paid, client_reference_id: "other" }, order, false)).toBe(false);
  expect(verifiedOrderPayment({ ...paid, metadata: { order_id: order.id, userId: "other" } }, order, false)).toBe(false);
  expect(verifiedOrderPayment({ ...paid, currency: "usd" }, order, false)).toBe(false);
  expect(verifiedOrderPayment(paid, order, true)).toBe(false);
});
it("não aprova sessão sem pagamento ou metadados, mesmo recebendo evento de conclusão", () => {
  expect(verifiedOrderPayment({ ...paid, payment_status: "no_payment_required" }, order, false)).toBe(false);
  expect(verifiedOrderPayment({ ...paid, metadata: null }, order, false)).toBe(false);
  expect(matchesOrderPayment({ ...paid, status: "expired", payment_status: "unpaid" }, order, false)).toBe(true);
  expect(matchesOrderPayment({ ...paid, amount_total: 0 }, order, false)).toBe(false);
});