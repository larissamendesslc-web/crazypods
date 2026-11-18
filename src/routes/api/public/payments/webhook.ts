import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import { matchesOrderPayment, verifiedOrderPayment, type PaymentSession } from "@/lib/payment-confirmation";

async function settle(session: PaymentSession & { id: string }, paid: boolean, env: StripeEnv) {
  const orderId = session.metadata?.["order_id"];
  if (!orderId) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order, error: readError } = await supabaseAdmin.from("orders").select("id,user_id,total,status,payment_method,payment_ref").eq("id", orderId).maybeSingle();
  if (readError) throw readError;
  if (!order || order.status !== "pendente" || order.payment_method !== "online") return;
  const expected = { ...order, total: Number(order.total) };
  if (!matchesOrderPayment(session, expected, env === "live")) throw new Error("Payment session does not match order");
  if (paid && !verifiedOrderPayment(session, expected, env === "live")) return;
  // A stale failed/expired session must not cancel a newer checkout for the same order.
  if (!paid && (session.payment_status === "paid" || (order.payment_ref && order.payment_ref !== session.id))) return;
  const { error } = await supabaseAdmin.rpc("confirm_online_payment", { _order_id: orderId, _paid: paid, _ref: session.id });
  if (error) throw error;
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") return Response.json({ received: true, ignored: "invalid env" });
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          const s = event.data.object;
          switch (event.type) {
            case "checkout.session.completed":
              await settle(s, true, env);
              break;
            case "checkout.session.async_payment_succeeded":
              await settle(s, true, env);
              break;
            case "checkout.session.async_payment_failed":
            case "checkout.session.expired":
              await settle(s, false, env);
              break;
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});