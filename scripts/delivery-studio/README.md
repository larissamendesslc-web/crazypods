# Crazy Delivery Studio 2.0 — preview branch

## What is delivered
This is an **admin-only, fictional logistics and payment simulator**, styled with existing Crazy Pods / Black Volt tokens.

- Two independent locations: Quitaúna and Jardim Boa Vista.
- Editable distance tiers, delivery fees, maximum radius and free-delivery threshold.
- Client-side calculation with explicit validation and boundary behavior.
- Enabled / disabled service draft.
- Illustrative payment-method toggles (Pix, cards, cash).
- Readable JSON output and **sessionStorage-only** recovery for one browser tab.
- No network calls, no financial credential entry, no order creation, no WhatsApp dispatch.
- No changes to the production shopping cart, route engine, database, or published branch.

**Important:** the default BRL amounts are invented examples for UI testing, not verified rates from Crazy1 or any real merchant. Kilometer inputs in the preview are manually supplied; **no road-distance API has been integrated**.

## Why the build uses an injection script
The existing repository reconstructs application files by unzipping an archive and applying several patches in `scripts/prepare-build.sh`. The standalone `scripts/delivery-studio/install.mjs` runs only after those previous patches; it copies the source modules and inserts one component before the admin settings' existing save bar.

The installer fails with a descriptive error when the expected integration point changes. It does not modify cart code or any merchant API.

## How to verify
1. Open a Vercel Preview deployment on this feature branch.
2. Sign into the existing admin console using authorized credentials.
3. Open Settings, scroll to Delivery Studio 2.0.
4. Switch between Quitaúna and Jardim Boa Vista and edit rates.
5. In the simulator, test 3 km vs 3.01 km, 12 km vs 12.01 km and subtotal just below / at the free-shipping threshold.
6. Disable a store, enter invalid or overlapping tiers and confirm no quote is produced.
7. Refresh the same tab and verify draft recovery; reset to example when done.
8. Check that storefront, checkout, WhatsApp links, inventory, database and production are unchanged.

## Unit tests
Node 22+:

```sh
node --experimental-strip-types --test scripts/delivery-studio/rates.test.mjs
```

GitHub Actions runs the same suite for pushes and PRs affecting this feature.

## Follow-up design decisions (not implemented)
- A legally compliant merchant could later move these rules to restricted Supabase tables, with RLS and validated admin write APIs.
- A trusted server-side routing provider should return road distance; use a fail-closed fallback if routes are unavailable. Do not present Haversine distance as actual road distance.
- Rate quotes should be recomputed server-side, not trusted from browsers, and versioned against store policies.
- Any lawful payment integration must be isolated server-side, idempotent, audited and activated only after regulatory and provider compliance checks.
- No real-purchase flow for electronic smoking devices is included or authorized by this preview.
