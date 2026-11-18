<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

<!-- AGENT-MEMORY:BEGIN -->
- Admin summary cards use shrinkable tracks and readable wrapping values; product detail grids use explicit single-column mobile tracks and stacked purchase controls. Why: intrinsic text and button widths must not widen phone pages or clip amounts.
- Signup validation is shared in a client-safe schema; CEP lookup uses validated ViaCEP responses independently of store availability, while authenticated shipping quotes still use private origin settings and Google road distances. Why: signup must not collect delivery addresses and postal lookup must not disappear when delivery settings are missing.
- New orders use sandbox Asaas hosted checkout via the linked connector gateway; legacy cs_ orders keep the own-key Stripe helper and existing webhook. Why: migrate without creating a second charge for old orders or exposing credentials.
- Asaas creation is claimed atomically on the order; ambiguous failures remain uncertain rather than retried, and approval requires a fetched matching checkout charge with exact gross total (RECEIVED, or CREDIT_CARD CONFIRMED). Why: avoid duplicate charges, forged callbacks and precautionarily blocked Pix fulfillment.
- Admin username aliases resolve to an Auth email identity before password sign-in; authorization still uses user_roles, and passwords never live in source. Why: username convenience must not bypass server authentication or role policies.
- Storefront chrome (header, cart, age gate, theme decor) is rendered in `__root.tsx` and skipped for `/admin*` paths; admin lives under `src/routes/admin.*` with `ssr: false` and gates on the `admin` role. Why: one app, admin can later be pointed to a subdomain.
- Orders use `place_order` and `set_order_status`; checkout uses DB totals, persists/reuses session IDs in payment_ref and idempotency keys. Webhooks and authenticated reconciliation verify session ownership, metadata, amount, currency and mode before idempotent `confirm_online_payment`; only paid/complete sessions approve. Why: recover missed webhooks, prevent duplicate checkouts and preserve settled orders.
- Public product reads must select explicit columns (`PUBLIC_PRODUCT_COLS`); `cost` is not granted to anon. Why: hide margins.
- Product images: background removed in the browser (`@imgly/background-removal`), stored as WebP in the private `product-images` bucket with long-lived signed URLs (workspace blocks public buckets).
- Seasonal themes are `[data-theme]` token overrides in `src/styles.css`, chosen in `site_settings.theme`.
- Seasonal imagery and hat overlays use CSS-gated storefront decorations; gradient lettering needs inline overhang space. Why: preserve the original logo, keep other themes unchanged and avoid clipped italic glyphs.
- Christmas snow is edge-masked and reduced, product stages share centered sizing, and mobile admin navigation uses a route-aware selector. Why: decoration must not obscure shopping content and the active admin section must remain visible on phones.
- Delivery uses authenticated Google Maps geocoding and road routes through the gateway; only server-created, user-bound, expiring quotes are accepted by five-argument `place_order`, which recomputes shipping and snapshots address/time. Why: clients cannot forge distances, omit shipping, reuse quotes or change the quoted address.
- Delivery origins and customer freight destinations share validated postal-centroid geocoding (approximate CEP centers allowed, mismatched/partial CEPs rejected), with at most two road routes and shared rates; quotes retain the full customer address and an insert-only trigger snapshots origin/WhatsApp. Why: house-number geocoding must not block CEP-based freight or lose delivery details.
- New freight calculations do not reuse persisted quotes without a calculation-basis marker; bounded in-memory postal route caching keys on CEP, settings version and origins. Why: avoid legacy house-number distances while deduplicating route calls for number/complement edits.
- Full delivery settings are admin-read-only; customer availability uses the authenticated `get_delivery_availability` projection, while authenticated delivery handlers alone read private settings with the server client. Why: calculate shipping without exposing the store's origin or internal configuration.
- Courier access lives in the protected couriers table, separate from profiles; assignment, transitions and GPS writes use authenticated SQL functions, and location reads require an active assigned order. Why: isolate each delivery and stop tracking on completion, cancellation or deactivation.
- Delivery tracking uses bounded foreground polling and browser geolocation; Maps loads lazily via its asynchronous callback. Why: keep this web-only phase honest about background GPS limitations and avoid billed route polling.
<!-- AGENT-MEMORY:END -->