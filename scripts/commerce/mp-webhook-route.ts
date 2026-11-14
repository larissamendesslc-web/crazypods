import { createFileRoute } from "@tanstack/react-router";
import { commerceBackendReady, commerceDb, json } from "@/lib/commerce-db.server";
import {
  fetchMercadoPagoPayment,
  verifyMercadoPagoWebhook,
} from "@/lib/mercadopago.server";

export const Route = createFileRoute("/api/commerce/mp-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!commerceBackendReady()) return json({ error: "Integração não configurada." }, 503);

        // Query data.id + request headers are used for HMAC verification.
        const url = new URL(request.url);
        let paymentId = url.searchParams.get("data.id");
        if (!paymentId) {
          try {
            const data: unknown = await request.json();
            const obj = data && typeof data === "object" ? data as {
              data?: { id?: string | number }
            } : {};
            paymentId = obj.data?.id === undefined ? null : String(obj.data.id);
          } catch {
            return json({ error: "Notificação inválida." }, 400);
          }
        }
        const verified = verifyMercadoPagoWebhook({
          signature: request.headers.get("x-signature"),
          requestId: request.headers.get("x-request-id"),
          dataId: paymentId,
          secret: process.env["MERCADOPAGO_WEBHOOK_SECRET"]!,
        });
        if (!verified) return json({ error: "Assinatura do webhook inválida." }, 401);

        try {
          const payment = await fetchMercadoPagoPayment(
            process.env["MERCADOPAGO_ACCESS_TOKEN"]!, paymentId!,
          );
          const db = commerceDb();
          const { data: order, error } = await db.from("commerce_orders")
            .select("id,status,total_cents,payment_id,sale_verified_at")
            .eq("id", payment.externalReference).maybeSingle();
          if (error) throw new Error("Banco indisponível.");
          if (!order || !order.sale_verified_at || payment.id !== order.payment_id ||
            payment.amountCents !== order.total_cents) {
            // Never mark paid if provider amount and stored order do not match.
            return json({ error: "Pagamento não associado ao pedido conferido." }, 409);
          }
          if (payment.status === "approved" && order.status !== "paid") {
            const { error: updated } = await db.from("commerce_orders")
              .update({ status: "paid", paid_at: new Date().toISOString() })
              .eq("id", order.id).eq("payment_id", payment.id)
              .in("status", ["awaiting_payment", "pending_payment"]);
            if (updated) throw new Error("Falha ao confirmar pedido.");
          }
          if (["cancelled", "rejected", "refunded", "charged_back"].includes(payment.status)) {
            const { error: updated } = await db.from("commerce_orders")
              .update({ status: "payment_review" })
              .eq("id", order.id).eq("payment_id", payment.id)
              .in("status", ["awaiting_payment", "pending_payment", "paid"]);
            if (updated) throw new Error("Falha ao atualizar status.");
          }
          const { error: eventError } = await db.from("commerce_payment_events")
            .upsert({
              provider: "mercadopago",
              payment_id: payment.id,
              order_id: order.id,
              status: payment.status,
              status_detail: payment.statusDetail,
              received_at: new Date().toISOString(),
            }, { onConflict: "provider,payment_id" });
          if (eventError) throw new Error("Falha ao registrar evento de pagamento.");
          return json({ received: true });
        } catch {
          // Retryable failure; do not acknowledge unprocessed notification.
          return json({ error: "Notificação ainda não processada." }, 503);
        }
      },
    },
  },
});
