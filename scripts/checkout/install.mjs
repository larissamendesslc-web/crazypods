import { copyFileSync, mkdirSync } from "node:fs";

// Integration intentionally touches ONLY backend pricing/payment files.
// No existing page, shop, cart, product, category, settings, or CSS is modified.
mkdirSync("src/routes/api/checkout", { recursive: true });
copyFileSync("scripts/checkout/payment-amounts.ts", "src/lib/checkout-payment-amounts.ts");
copyFileSync("scripts/checkout/quote.server.ts", "src/lib/checkout-quote.server.ts");
copyFileSync("scripts/checkout/mercadopago.server.ts", "src/lib/checkout-mercadopago.server.ts");
copyFileSync("scripts/checkout/payment-methods.route.ts", "src/routes/api/checkout/payment-methods.ts");
copyFileSync("scripts/checkout/quote.route.ts", "src/routes/api/checkout/quote.ts");
console.log("Crazy Checkout payment backend installed; existing site and catalogue untouched.");
