import { copyFileSync, readFileSync, writeFileSync } from "node:fs";

/** The repository reconstructs its application from an archive + patches.
 * Apply only after the delivery installation; fail closed if anchors change.
 */
const copy = (from, to) => copyFileSync("scripts/commerce/" + from, to);
const replaceOnce = (source, anchor, replacement, description) => {
  if (!source.includes(anchor)) throw new Error("Crazy Commerce installation stopped: " + description);
  return source.replace(anchor, replacement);
};

copy("catalog.ts", "src/lib/commerce-model.ts");
copy("catalog-data.ts", "src/lib/commerce-data.ts");
copy("CommerceManager.tsx", "src/components/commerce-manager.tsx");
copy("UniversalStorefront.tsx", "src/components/universal-storefront.tsx");

const route = [
  'import { createFileRoute } from "@tanstack/react-router";',
  'import { UniversalStorefront } from "@/components/universal-storefront";',
  'export const Route = createFileRoute("/loja")({',
  '  component: UniversalStorefront,',
  '  head: () => ({ meta: [{ title: "CRAZY COMMERCE — Produtos e acessórios" },',
  '    { name: "description", content: "Confira as novidades da nossa loja." }] }),',
  '});',
  '',
].join("\n");
writeFileSync("src/routes/loja.tsx", route);

const adminPath = "src/routes/_authenticated/admin.tsx";
let admin = readFileSync(adminPath, "utf8");
admin = replaceOnce(admin,
  'import { AdminSettings } from "@/components/admin-settings";',
  'import { AdminSettings } from "@/components/admin-settings";\nimport { CommerceManager } from "@/components/commerce-manager";',
  "admin import");
admin = replaceOnce(admin,
  'useState<"pods" | "site" | "orders" | OperationsView>',
  'useState<"pods" | "site" | "orders" | "commerce" | OperationsView>',
  "tab type");
admin = replaceOnce(admin,
  '["orders", "Pedidos pendentes"],',
  '["orders", "Pedidos pendentes"],\n              ["commerce", "Catálogo universal"],',
  "commerce admin tab");
admin = replaceOnce(admin,
  '        ) : activeTab === "orders" ? (',
  '        ) : activeTab === "commerce" ? (\n          <CommerceManager />\n        ) : activeTab === "orders" ? (',
  "catalog display");
writeFileSync(adminPath, admin);

console.log("Crazy Commerce: catalogue editor and separate /loja storefront installed.");
