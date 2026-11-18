import { describe, expect, it } from "vitest";
import { verifiedAsaasPayment, paymentReturnUrl } from "./asaas";
const id = "40d8c9e9-b188-401f-86fe-a3f49d166288";
const paid = { id: "pay_test", checkoutSession: id, value: 97.13, billingType: "PIX", status: "RECEIVED" };
describe("Asaas order confirmation", () => {
  it("confirms the exact products plus freight total", () => {
    expect(verifiedAsaasPayment(paid, id, 97.13)).toBe(true);
    expect(verifiedAsaasPayment({ ...paid, value: 80 }, id, 97.13)).toBe(false);
  });
  it("does not approve unpaid or precautionarily blocked Pix", () => {
    for (const status of ["PENDING", "CONFIRMED", "REFUNDED", "RECEIVED_IN_CASH"]) expect(verifiedAsaasPayment({ ...paid, status }, id, 97.13)).toBe(false);
    expect(verifiedAsaasPayment({ ...paid, billingType: "CREDIT_CARD", status: "CONFIRMED" }, id, 97.13)).toBe(true);
  });
  it("rejects another checkout and deleted charges", () => {
    expect(verifiedAsaasPayment(paid, "0685a553-b87f-4181-88d0-bc74bf552ff6", 97.13)).toBe(false);
    expect(verifiedAsaasPayment({ ...paid, deleted: true }, id, 97.13)).toBe(false);
  });
  it("rejects external redirect origins", () => {
    expect(paymentReturnUrl("https://flavor-flock-market.lovable.app", id)).toContain(`/pedido/${id}`);
    expect(paymentReturnUrl("https://crazypods.vercel.app", id)).toContain(`/pedido/${id}`);
    expect(() => paymentReturnUrl("https://evil.example", id)).toThrow();
  });
});