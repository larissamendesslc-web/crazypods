import { createFileRoute } from "@tanstack/react-router";
import { readOnlySubtotalHandler } from "@/lib/checkout-quote.server";

export const Route = createFileRoute("/api/checkout/quote")({
  server: {
    handlers: {
      POST: ({ request }) => readOnlySubtotalHandler(request),
    },
  },
});
