import { z } from "zod";

export const asaasCheckoutSchema = z.object({
  id: z.string().uuid(), status: z.enum(["ACTIVE", "PAID", "CANCELED", "EXPIRED"]),
  externalReference: z.string().optional().nullable(), link: z.string().optional().nullable(),
  items: z.array(z.object({ value: z.number().positive(), quantity: z.number().int().positive() })).optional(),
});
export const asaasPaymentSchema = z.object({
  id: z.string(), checkoutSession: z.string().uuid().optional().nullable(),
  value: z.number().positive(), status: z.string(), billingType: z.string(), deleted: z.boolean().optional(),
});
export type AsaasPayment = z.infer<typeof asaasPaymentSchema>;
export function verifiedAsaasPayment(payment: AsaasPayment, checkoutId: string, total: number) {
  return !payment.deleted && payment.checkoutSession === checkoutId &&
    Math.round(payment.value * 100) === Math.round(total * 100) &&
    (payment.status === "RECEIVED" || (payment.status === "CONFIRMED" && payment.billingType === "CREDIT_CARD"));
}
export function asaasCheckoutLink(id: string, mode: "sandbox" | "live" = "sandbox") {
  const base = mode === "sandbox" ? "https://sandbox.asaas.com" : "https://asaas.com";
  return `${base}/checkoutSession/show?id=${z.string().uuid().parse(id)}`;
}
export function paymentReturnUrl(origin: string, id: string) {
  const url = new URL(origin);
  const allowed = url.origin === "http://localhost:8080" ||
    (url.protocol === "https:" && (url.origin === process.env["SITE_URL"] || url.hostname === "flavor-flock-market.lovable.app" ||
      url.hostname === "crazypods.vercel.app" ||
      url.hostname === "crazypods-pmerj.vercel.app" ||
      /^crazypods-[a-z0-9]+-pmerj\.vercel\.app$/.test(url.hostname) ||
      /^id-preview(?:-[a-z0-9]+)?--12827ac0-438c-42ab-8df6-40550c5cd1fd(?:\.[a-z0-9-]+)?\.lovable\.app$/.test(url.hostname)));
  if (!allowed) throw new Error("Endereço de retorno inválido");
  return `${url.origin}/pedido/${z.string().uuid().parse(id)}?payment_return=1`;
}