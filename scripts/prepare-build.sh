#!/usr/bin/env bash
set -euo pipefail

# Match the archive deployed by the original Vercel install command.
unzip -oq 'pod-parlor-of-tomorrow (1).zip'
git apply --check crazy-seasons.patch
git apply crazy-seasons.patch
node scripts/mobile-polish.mjs
node scripts/floating-cart.mjs
# Install approved Black Ice artwork and keep the age confirmation as real interactive HTML.
mkdir -p public/seasonal
base64 -d overrides/black-ice-age-bg.webp.base64 > public/seasonal/black-ice-age-bg.webp
cp overrides/age-gate.tsx src/components/age-gate.tsx
cat overrides/age-gate.css >> src/styles.css

logo_dir="public/__l5e/assets-v1/4899a810-cb7b-4859-a781-ea2a51845235"
mkdir -p "$logo_dir"
cp public/favicon.png "$logo_dir/crazy-pods-logo.png"
bun install --frozen-lockfile
