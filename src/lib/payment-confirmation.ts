export type PaymentSession = {
  mode: string | null; status: string | null; payment_status: string;
  client_reference_id: string | null; currency: string | null; amount_total: number | null;
  livemode: boolean; metadata: Record<string, string> | null;
};
export function verifiedOrderPayment(session: PaymentSession, order: { id: string; user_id: string; total: number }, live: boolean) {
  return session.status === "complete" && session.payment_status === "paid" && matchesOrderPayment(session, order, live);
}
export function matchesOrderPayment(session: PaymentSession, order: { id: string; user_id: string; total: number }, live: boolean) {
  return session.mode === "payment" && session.client_reference_id === order.id && session.metadata?.["order_id"] === order.id
    && session.metadata?.["userId"] === order.user_id && session.currency === "brl"
    && session.amount_total === Math.round(order.total * 100) && session.livemode === live;
}