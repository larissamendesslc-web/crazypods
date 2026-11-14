import { createHash, timingSafeEqual } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { commerceBackendReady, commerceDb, json, limitedJson } from "@/lib/commerce-db.server";
import { createPixCharge } from "@/lib/mercadopago.server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tokenPattern = /^[A-Za-z0-9_-]{32,128}$/;

export const Route = createFileRoute("/api/commerce/pix")({
  server: {
    handlers: {
      GET: async () => json({
        provider: "mercadopago",
        method: "pix",
        enabled: commerceBackendReady(),
        orderCreationReady: false,
        note: "Cobranças somente após cadastro, migração do banco e liberação do checkout oficial.",
      }),
      POST: async ({ request }) => {
        if (!commerceBackendReady()) {
          return json({ error: "Pagamento Pix ainda não habilitado para esta loja." }, 503);
        }
        let body: unknown;
        try { body = await limitedJson(request); }
        catch { return json({ error: "Solicitação inválida." }, 400); }
        const input = body && typeof body === "object" && !Array.isArray(body)
          ? body as Record<string, unknown> : {};
        const orderId = input.orderId;
        const bearerToken = input.orderToken;
        if (typeof orderId !== "string" || !uuid.test(orderId) ||
          typeof bearerToken !== "string" || !tokenPattern.test(bearerToken))
          return json({ error: "Solicitação inválida." }, 400);

        const db = commerceDb();
        const { data: order, error } = await db.from("commerce_orders")
          .select("id,access_hash,total_cents,payer_email,status,expires_at,sale_verified_at,payment_id,pix_code,pix_image")
          .eq("id", orderId).maybeSingle();
        if (error) return json({ error: "Não foi possível consultar o pedido." }, 503);
        // All invalid access attempts look the same, regardless of order existence.
        const inputHash = createHash("sha256").update(bearerToken).digest();
        const savedHash = typeof order?.access_hash === "string" && /^[a-f0-9]{64}$/i.test(order.access_hash)
          ? Buffer.from(order.access_hash, "hex") : Buffer.alloc(32, 0);
        const authorized = timingSafeEqual(inputHash, savedHash);
        if (!order || !authorized)
          return json({ error: "Pedido não encontrado." }, 404);
        if (!order.sale_verified_at || !["pending_payment", "awaiting_payment"].includes(order.status) ||
          !Number.isSafeInteger(order.total_cents) || order.total_cents < 100 ||
          Date.parse(order.expires_at) <= Date.now()) {
          return json({ error: "Este pedido não está disponível para pagamento." }, 409);
        }
        if (order.payment_id && order.pix_code) {
          return json({
            paymentId: order.payment_id,
            qrCode: order.pix_code,
            qrCodeBase64: order.pix_image ?? null,
            status: "awaiting_payment",
          });
        }
        try {
          const token = process.env["MERCADOPAGO_ACCESS_TOKEN"]!;
          const publicOrigin = process.env["COMMERCE_PUBLIC_ORIGIN"]!;
          const secret = process.env["MERCADOPAGO_WEBHOOK_SECRET"]!;
          const charge = await createPixCharge({
            accessToken: token, webhookSecret: secret, baseUrl: publicOrigin,
          }, {
            id: order.id,
            amountCents: order.total_cents,
            payerEmail: order.payer_email,
            description: "Pedido da loja #" + order.id.slice(0, 8),
            expiresAt: order.expires_at,
          });
          const { error: saved } = await db.from("commerce_orders")
            .update({
              payment_id: charge.paymentId,
              pix_code: charge.copyPaste,
              pix_image: charge.qrCodeBase64,
              status: "awaiting_payment",
            })
            .eq("id", order.id).in("status", ["pending_payment", "awaiting_payment"]);
          if (saved) throw new Error("Falha ao registrar o pagamento gerado.");
          return json({
            paymentId: charge.paymentId,
            qrCode: charge.copyPaste,
            qrCodeBase64: charge.qrCodeBase64,
            status: "awaiting_payment",
          });
        } catch {
          return json({ error: "Não foi possível gerar o Pix. Tente novamente." }, 502);
        }
      },
    },
  },
});
