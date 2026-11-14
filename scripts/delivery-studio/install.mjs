import { copyFileSync, readFileSync, writeFileSync } from "node:fs";

// The storefront is reconstructed from the original archived project and patches
// during Vercel's build. Keep the delivery studio separate from customer checkout.
const target = "src/components/admin-settings.tsx";
let source = readFileSync(target, "utf8");
const importLine = 'import { DeliveryPricingStudio } from "@/components/delivery-pricing-studio";\n';
const anchor = '      <div className="sticky bottom-4 flex justify-end">';

if (!source.includes(anchor)) {
  throw new Error("Delivery studio: admin settings insertion point changed. Refusing unsafe injection.");
}
if (source.includes("DeliveryPricingStudio")) {
  throw new Error("Delivery studio: attempted to apply twice.");
}

source = importLine + source.replace(
  anchor,
  '      <DeliveryPricingStudio />\n\n' + anchor,
);
writeFileSync(target, source);
copyFileSync(
  "scripts/delivery-studio/rates.ts",
  "src/lib/delivery-pricing.ts",
);
copyFileSync(
  "scripts/delivery-studio/DeliveryPricingStudio.tsx",
  "src/components/delivery-pricing-studio.tsx",
);
console.log("Crazy Delivery Studio: admin-only simulation integrated.");


copyFileSync("scripts/delivery-studio/route-demo.ts", "src/lib/demo-road-routes.ts");
copyFileSync("scripts/delivery-studio/CartDemoCheckout.tsx", "src/components/cart-demo-checkout.tsx");

/** Introduce one validated, preview-namespaced demo-pricing field in existing site settings. */
const settingsPath = "src/lib/settings.ts";
let settings = readFileSync(settingsPath, "utf8");
function patchOnce(target, oldValue, newValue, label) {
  if (!target.includes(oldValue)) throw new Error("Delivery studio: expected " + label + " not found. Build stopped.");
  return target.replace(oldValue, newValue);
}
settings = patchOnce(settings,
  'import { emptyStores,',
  'import { exampleDeliveryConfig, readDeliveryDemo, type DeliveryStudioConfig } from "@/lib/delivery-pricing";\nimport { emptyStores,',
  "settings pricing import");
settings = patchOnce(settings,
  "  deliveryStores: Record<StoreId, DeliveryStore>;",
  "  deliveryStores: Record<StoreId, DeliveryStore>;\n  deliveryPricingDemo: DeliveryStudioConfig;",
  "settings pricing type");
settings = patchOnce(settings,
  "  deliveryStores: emptyStores,",
  "  deliveryStores: emptyStores,\n  deliveryPricingDemo: exampleDeliveryConfig,",
  "pricing default");
settings = patchOnce(settings,
  '          .filter((key) => key in raw && key !== "season" && key !== "deliveryStores")',
  '          .filter((key) => key in raw && key !== "season" && key !== "deliveryStores" && key !== "deliveryPricingDemo")',
  "pricing guarded deserialization");
settings = patchOnce(settings,
  '      deliveryStores: readDeliveryStores(raw["deliveryStores"]),',
  '      deliveryStores: readDeliveryStores(raw["deliveryStores"]),\n      deliveryPricingDemo: readDeliveryDemo(raw[deliveryDemoKey]),',
  "pricing loaded from settings");
settings = patchOnce(settings,
  'export const settingsQuery = queryOptions({',
  'const deliveryDemoKey = import.meta.env["VITE_CRAZY_SEASONS_PREVIEW"] === "1" ? "crazy_delivery_demo_preview_v1" : "crazy_delivery_demo_v1";\n\nexport const settingsQuery = queryOptions({',
  "namespaced preview pricing");
settings = patchOnce(settings,
  "export const waBase = ",
  'export function saveDeliveryDemo(draft: DeliveryStudioConfig) {\n  const payload = JSON.parse(JSON.stringify(draft)) as Json;\n  return saveSettingsPatch({ [deliveryDemoKey]: payload });\n}\n\nexport const waBase = ',
  "save demo pricing");
writeFileSync(settingsPath, settings);

/** Replace live order submission with a test-only cart quotation. */
const shopPath = "src/components/shop.tsx";
let shop = readFileSync(shopPath, "utf8");
shop = patchOnce(shop,
  'import { CartCheckout } from "@/components/cart-checkout";',
  'import { CartCheckout } from "@/components/cart-demo-checkout";',
  "shop cart import");
shop = patchOnce(shop,
  '              deliveryStores={settings.deliveryStores}',
  '              deliveryStores={settings.deliveryStores}\n              deliveryPolicy={settings.deliveryPricingDemo}',
  "shared pricing props");
writeFileSync(shopPath, shop);

console.log("Crazy Delivery 2.0: safe demo cart + shared admin pricing integrated.");
