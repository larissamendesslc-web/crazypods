import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { asaasRequest, findPaidAsaasPayment } from "@/lib/asaas.server";

export const Route = createFileRoute("/api/public/payments/asaas-webhook")({
  server: { handlers: { POST: async ({ request }) => {
    const expected = process.env['ASAAS_TEST_WEBHOOK_TOKEN'];
    const supplied = request.headers.get("asaas-access-token");
    if (!expected) return new Response("Webhook not configured", { status: 503 });
    if (!supplied || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return new Response("Unauthorized", { status: 401 });
    try {
      const event = z.object({ event: z.string(), checkout: z.object({ id: z.string().uuid() }).optional(), payment: z.object({ id: z.string() }).optional() }).parse(await request.json());
      let checkoutId = event.checkout?.id;
      if (!checkoutId && event.payment) {
        const payment = z.object({ checkoutSession: z.string().uuid().nullable().optional() }).parse(await asaasRequest(`/payments/${encodeURIComponent(event.payment.id)}`));
        checkoutId = payment.checkoutSession ?? undefined;
      }
      if (!checkoutId) return Response.json({ received: true });
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: order, error } = await supabaseAdmin.from("orders").select("id,total,status,payment_method,asaas_checkout_id").eq("asaas_checkout_id", checkoutId).maybeSingle();
      if (error) throw error;
      if (!order || order.status !== "pendente" || order.payment_method !== "online") return Response.json({ received: true });
      const payment = await findPaidAsaasPayment(checkoutId, Number(order.total));
      if (payment) {
        const { error: confirmError } = await supabaseAdmin.rpc("confirm_online_payment", { _order_id: order.id, _paid: true, _ref: `asaas:sandbox:${checkoutId}` });
        if (confirmError) throw confirmError;
        await supabaseAdmin.from("orders").update({ asaas_checkout_state: "paid" }).eq("id", order.id);
      } else if (event.event === "CHECKOUT_CANCELED" || event.event === "CHECKOUT_EXPIRED") {
        const { error: cancelError } = await supabaseAdmin.rpc("confirm_online_payment", { _order_id: order.id, _paid: false, _ref: `asaas:sandbox:${checkoutId}` });
        if (cancelError) throw cancelError;
        await supabaseAdmin.from("orders").update({ asaas_checkout_state: event.event === "CHECKOUT_EXPIRED" ? "expired" : "canceled" }).eq("id", order.id);
      }
      return Response.json({ received: true });
    } catch { return new Response("Webhook processing failed", { status: 500 }); }
  } } },
});