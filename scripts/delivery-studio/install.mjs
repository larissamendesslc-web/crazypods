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
