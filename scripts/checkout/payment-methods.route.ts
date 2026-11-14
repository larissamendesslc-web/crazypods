import { createFileRoute } from "@tanstack/react-router";
import { paymentMethodsStatus } from "@/lib/checkout-quote.server";

export const Route = createFileRoute("/api/checkout/payment-methods")({
  server: {
    handlers: {
      GET: () => new Response(JSON.stringify(paymentMethodsStatus()), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store, private",
        },
      }),
    },
  },
});
