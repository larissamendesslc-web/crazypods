# CRAZY COMMERCE — Universal Catalogue + Payment Architecture

## What is implemented

**Separate from the original niche-specific catalogue.** No legacy products are migrated.

- Admin > **Catálogo universal**: create categories, SKUs and merchandise; publish, archive, edit base and variant prices, inventory for Quitaúna / Jardim Boa Vista, descriptions and HTTPS image URLs.
- A new generic public storefront at **/loja**, with category navigation, search, variant picker, cart and pricing by product/variant in integer centavos.
- Prices in the public cart are always derived from the server-loaded catalogue, never trusted as raw numbers from the cart's session storage.
- Local cart persisted per browser tab. Inventory is displayed as a preview and validated against catalogue stock at render time, *not reserved*.
- CEP lookup and estimated delivery reuse the existing address and delivery-price policies; the route provider is still the OSRM community demo, so shipping is not an official quote.
- Admin draft is stored in a dedicated, versioned key of the existing `site_settings` JSON using the site's authenticated admin and existing RLS. Preview and production use **different** keys.
- Business-facing Pix payment adapter, signed webhook verification and protected TanStack Start API endpoints.
- Suggested normalized PostgreSQL schema, not applied: `migration-draft.sql`.

## Payment state — deliberately DISABLED

**Do not enable real payments now.** A production payment flow must be fully server-authorized and atomic.

- `GET /api/commerce/pix` reports a redacted feature readiness state.
- `POST /api/commerce/pix` refuses when the backend is not configured.
- Even when configured, it expects an existing verified and durable order with a secret access token; it **never receives a client-provided amount**.
- Mercado Pago `POST /v1/payments` uses a server-side access token and a stable `X-Idempotency-Key` per order.
- `POST /api/commerce/mp-webhook` verifies HMAC / timestamp, retrieves the payment again from Mercado Pago and checks amount + order linkage before recording payment status.
- The webhook does not automatically fulfill products. Before activation, implement atomic inventory reservation, reduction/release and a complete order-creation service.
- No provider credentials or Pix keys are committed to Git or exposed to the browser.

### Environment names (server-side only)

These are **names**, not credential values. Configure via Vercel Project Settings > Environment Variables using the merchant's own accounts:

```env
COMMERCE_PAYMENTS_ENABLED=0
COMMERCE_SUPABASE_URL=
COMMERCE_SUPABASE_SERVICE_ROLE_KEY=
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=
COMMERCE_PUBLIC_ORIGIN=https://crazypods.vercel.app
```

- Keep `COMMERCE_PAYMENTS_ENABLED=0` until **all** launch checks below pass.
- Never prefix secrets with `VITE_` or `NEXT_PUBLIC_`.
- Use Mercado Pago **test credentials / environment** for end-to-end testing, not a production access token.
- Configure webhook callback through Mercado Pago's authenticated developer portal; exact endpoint: `https://crazypods.vercel.app/api/commerce/mp-webhook`.
- Do not send access tokens in chat or store them in the Supabase public `site_settings` JSON.

### Must be completed before the first real order

1. Identify and connect the actual Crazy Commerce Supabase project. The current connected Supabase account does not list it; this repository's runtime config may refer to a different project/account. **Never run migrations against a similarly named unrelated project.**
2. Review and apply `migration-draft.sql` to the correct database, after backup and migration review.
3. Migrate admin-published, legally saleable merchandise from the temporary `site_settings` catalogue into normalized commerce tables with RLS and safe admin authorization, *without* copying old niche products.
4. Implement authenticated admin CRUD for normalized catalogue/inventory, atomic stock reservation and sale approval, cancel/expiry and refund flows.
5. Implement an order-creation server endpoint that recomputes all product prices, stock, tax/shipping rules and permissions from trusted tables. It must not accept checkout totals from the browser.
6. Replace public OSRM with a contracted route provider, and use only merchant-approved fixed zone fees or server-verified routes for delivery.
7. Enable Mercado Pago Pix through a verified merchant account; use a separate Checkout Pro preference for card/debit flows (avoid storing sensitive card numbers). Sign/verify webhooks, reconcile, handle duplicate events and verify settlements.
8. Test price tampering, quantity changes, out-of-stock, duplicate checkout, failing routing provider, invalid webhook signature, delayed Pix, chargeback, multi-store fulfillment, data deletion/privacy, mobile UX and security headers.
9. Confirm fiscal/legal business information, returns policy, privacy/LGPD, merchant approval and category/product compliance before enabling checkout.

## How to test the new UI

1. Open Preview `/admin` with admin credentials, choose **Catálogo universal**.
2. Create categories (e.g. Capinhas, Fones), save.
3. Create product: name, category, SKU, price e.g. `89,90`, two-unit stock, photo URL.
4. Add optional variations, set variant-specific stock and price, and mark **Publicado**.
5. Apply product and click **Salvar catálogo**.
6. Open the **same Preview deployment** at `/loja`; add items and check that prices/quantities/subtotal change instantly.
7. Test out-of-stock and switching stores, and input a CEP for an *estimated*, nonbinding delivery fee.

## Implementation constraints

The current build reconstructs the app from an archived project and multiple patches, and then injects the new modules with `scripts/commerce/install.mjs`. The installer fails if admin insertion anchors move.

The initial versioned catalogue in `site_settings` is intentionally bounded to 150 categories and 1500 products; replace this temporary store with normalized SQL tables before taking real orders.

**Supported here:** catalogue management and payment integration groundwork.  
**Not supported here yet:** real order creation, real charge, warehouse fulfillment, product invoices or seller settlement.

### Reference documentation

- Mercado Pago Pix: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-payments/integration-configuration/integrate-pix
- Mercado Pago webhook validation: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/optional-notifications
- Mercado Pago Checkout Pro card/debit: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/create-payment-preference
- TanStack Start server routes: https://tanstack.com/start/latest/docs/framework/react/guide/server-routes
