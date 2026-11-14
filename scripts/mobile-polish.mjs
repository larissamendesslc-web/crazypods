import { readFileSync, writeFileSync } from "node:fs";

function update(path, edits) {
  let source = readFileSync(path, "utf8");
  for (const [before, after] of edits) {
    if (!source.includes(before)) {
      throw new Error("Mobile polish: expected source not found in " + path + ": " + before.slice(0, 80));
    }
    source = source.replace(before, after);
  }
  writeFileSync(path, source);
}

update("src/components/shop.tsx", [
  ['className="h-20 w-20 rounded-md border border-border object-cover"', 'className="mobile-store-logo h-20 w-20 rounded-md border border-border object-cover"'],
  ['className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-whatsapp', 'className="mobile-whatsapp-button fixed bottom-6 right-6 z-30 grid h-14 w-14 place-items-center rounded-full bg-whatsapp'],
  ['className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4"', 'className="mobile-product-grid grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4"'],
  ['className="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card', 'className="mobile-product-card group flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card'],
  ['className="bg-product-stage relative h-52 w-full rounded-none p-5 hover:bg-transparent sm:h-64"', 'className="mobile-product-stage bg-product-stage relative h-52 w-full rounded-none p-5 hover:bg-transparent sm:h-64"'],
  ['className="mt-3 h-40 w-full object-contain transition duration-500', 'className="mobile-product-image mt-3 h-40 w-full object-contain transition duration-500'],
  ['className="flex flex-1 flex-col p-3 sm:p-4"', 'className="mobile-product-content flex flex-1 flex-col p-3 sm:p-4"'],
  ['className="product-name font-display text-sm font-bold leading-snug"', 'className="mobile-product-name product-name font-display text-sm font-bold leading-snug"'],
  ['className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-3 pt-4"', 'className="mobile-product-actions mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-3 pt-4"'],
  ['className="font-display text-base font-bold sm:text-lg"', 'className="mobile-product-price font-display text-base font-bold sm:text-lg"'],
  ['className="h-auto min-h-9 max-w-full shrink-0 whitespace-normal rounded-full px-3 py-2 text-xs font-bold"', 'className="mobile-product-button h-auto min-h-9 max-w-full shrink-0 whitespace-normal rounded-full px-3 py-2 text-xs font-bold"'],
]);

const path = "src/styles.css";
const marker = "/* CRAZY MOBILE POLISH: screenshot-based responsive corrections */";
let style = readFileSync(path, "utf8");
if (style.includes(marker)) throw new Error("Mobile polish already applied");
style += "\n" + readFileSync("scripts/mobile-polish.css", "utf8");
writeFileSync(path, style);
console.log("Crazy Mobile Polish applied.");
