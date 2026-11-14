#!/usr/bin/env bash
set -euo pipefail

# Match the archive deployed by the original Vercel install command.
unzip -oq 'pod-parlor-of-tomorrow (1).zip'
git apply --check crazy-seasons.patch
git apply crazy-seasons.patch
git apply black-volt.patch
node scripts/mobile-polish.mjs
node scripts/floating-cart.mjs

# Native CRAZY ORDERS: strictly fictional cart, link handoff, admin inbox.
mkdir -p src/components src/lib src/routes
cp overrides/orders-native/orders-demo.ts src/lib/orders-demo.ts
cp overrides/orders-native/orders-demo.tsx src/components/orders-demo.tsx
cp overrides/orders-native/orders-demo.test.ts src/lib/orders-demo.test.ts
cp overrides/orders-native/pedidos-demo-route.tsx src/routes/pedidos-demo.tsx
node scripts/enable-orders-native.mjs

logo_dir="public/__l5e/assets-v1/4899a810-cb7b-4859-a781-ea2a51845235"
mkdir -p "$logo_dir"
cp public/favicon.png "$logo_dir/crazy-pods-logo.png"
bun install --frozen-lockfile
bunx vitest run src/lib/orders-demo.test.ts
