# CRAZY CHECKOUT — ONLY pricing and payments for the EXISTING store

## Non-negotiable scope

Keep **all existing products, categories, home page, photos, cart layout, admin tabs, animations, styles, and seasonal features unchanged**. Do not create a second shop or migrate inventory. All current products remain managed by the owner's existing admin workflow.

### Work implemented on this branch

1. Existing cart prices are now refreshed from the site's own `productsQuery` (every 30 seconds and on focus). This synchronizes items already present in the cart when the owner updates a product price, while preserving the existing markup and layout.
2. A pure pricing engine validates server-read product IDs, quantities, options and current sale prices in integer centavos. Never trusts `expected_price` supplied by the browser.
3. Shipping is still provided by the approved Crazy Delivery module. The final sum uses `subtotalCents + shippingCents` with range validation; the customer-facing shipping value remains an **estimate**.
4. A server-only Mercado Pago Checkout Pro adapter builds a hosted payment from a **verified, legally saleable, stock-reserved order**. Supports whichever Pix/card methods the merchant has enabled at Mercado Pago.
5. Webhook signature validation helper (HMAC SHA-256) is tested, but **webhook processing and real stock/payment settlement are not active**.
6. Status-only API at `GET /api/checkout/payment-methods`, which correctly reports payment methods **disabled**.
7. Read-only server quote API at `POST /api/checkout/quote` can validate current subtotal against `public.products` after the **correct database** is connected. It does not create an order or charge anything.

These are new backend modules installed by `scripts/checkout/install.mjs` after the existing build patches. No new public-facing pages, marketing components or styles.

## Current payment state

| Method | Customer flow when officially enabled | Now |
|---|---|---|
| Pix | Mercado Pago hosted checkout provides payment instructions; confirmation via verified webhook and provider status | Disabled |
| Credit/debit card | Customer pays within Mercado Pago's protected Checkout Pro; site does not collect card numbers | Disabled |
| Cash on delivery | Store confirms order and cash receipt; not automatically marked paid | Disabled |
| Existing WhatsApp | Existing approved demo behavior is preserved | Unchanged |

No keys are shipped in browser JavaScript.

## Why live payments are not enabled

- The original Lovable project **Pod Parlor Of Tomorrow** exposes a database matching the deployed schema. Read-only inspection confirmed \`products\`, \`inventory\`, \`shop_orders\`, \`site_settings\` and existing order RPCs. No product, order, or schema was modified. **The Vercel server still requires an authorized, securely configured credential for that database** before the server quote endpoint can operate.
- The database contains order creation/confirmation RPCs. The current public checkout still uses the separate Crazy Delivery demonstration flow; those existing order routines have not been audited for payment/stock reservation.
- A payment request must use a **server-generated order**, with items eligible for legal sale, prices refreshed from the DB, stock reserved atomically, shipping policy validated on the server, an immutable amount and a buyer ownership token. Browser-only calculations cannot authorize a charge.
- Existing product inventory does not yet expose verified, atomic checkout reservations for payments. It would risk overselling if activated now.
- The merchant's Mercado Pago developer integration, merchant approval and webhook signature secret have not been connected or verified.
- Some current products may be legally restricted; a real checkout must exclude disallowed products by enforced server classification, not by a cosmetic frontend toggle.

## Connect the infrastructure safely

Connect/authorize **the actual Crazy Pods Supabase/Lovable database**, ensuring admin permissions. Once the merchant authorizes the destination project, review schema/RLS and add checkout tables and idempotent server order creation.

Configure in **Vercel Project → Settings → Environment Variables** (server-side only, never in `VITE_*`; use restricted Preview/test credentials before production):

```env
CHECKOUT_DB_URL=https://<project-ref>.supabase.co
CHECKOUT_DB_SERVICE_KEY=<server-only-role-secret>
MERCADOPAGO_ACCESS_TOKEN=<merchant-access-token>
MERCADOPAGO_WEBHOOK_SECRET=<merchant-webhook-signature-secret>
```

**Never paste those secrets in ChatGPT or commit them to GitHub.** In production, use a separate, fully audited `PAYMENTS_ACTIVE` gate in the server *only after* the following launch conditions pass: RLS, legal-product validation, order creation and stock reservation, official road-distance/shipping service, webhook reconciliation, cancel/refund workflows, integration tests.

The public OSRM endpoint currently used for distance simulation is **not** a production-grade commercial routing provider; replace it or use admin-approved fixed delivery fees with server-side quoting.

## Tested / untested

GitHub Actions runs pure calculation and hosted-payment security tests from `.github/workflows/checkout-payments.yml`. Vercel preview validates build.

Still required: authorized database integration; credentialed sandbox checkout; webhook-to-order reconciliation; multi-user concurrency, stock and refunds; mobile/in-browser visual check; merchant compliance review. **Do not advertise the site as ready for real payments until these work.**

## References

- Mercado Pago Checkout Pro: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/create-payment-preference
- Mercado Pago notifications: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/payment-notifications
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
