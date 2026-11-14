import { readFileSync,writeFileSync } from "node:fs";
const patch=(path,needle,replacement)=>{
 const content=readFileSync(path,"utf8");
 const hits=content.split(needle).length-1;
 if(hits!==1)throw new Error("Native orders integration: expected one anchor in "+path+", found "+hits);
 writeFileSync(path,content.replace(needle,replacement));
};
// This is an optional test-only feature. It never touches the real products cart or shop DB.
patch("src/components/shop.tsx",
 'import { ImageOff, ArrowUpRight } from "lucide-react";',
 'import { ImageOff, ArrowUpRight, ClipboardList } from "lucide-react";');
patch("src/components/shop.tsx",
 'const NAV = [\n',
 'const NAV = [\n  { to: "/pedidos-demo", label: "Pedidos · Demo", icon: ClipboardList },\n');
patch("src/routes/_authenticated/admin.tsx",
 'import { AdminOperations, type OperationsView } from "@/components/admin-operations";',
 'import { AdminOperations, type OperationsView } from "@/components/admin-operations";\nimport { SampleOrdersAdmin } from "@/components/orders-demo";');
patch("src/routes/_authenticated/admin.tsx",
 'useState<"pods" | "site" | OperationsView>("overview")',
 'useState<"pods" | "site" | "ordersDemo" | OperationsView>("overview")');
patch("src/routes/_authenticated/admin.tsx",
 '              ["finance", "Financeiro"],\n',
 '              ["finance", "Financeiro"],\n              ["ordersDemo", "Pedidos · Demo"],\n');
patch("src/routes/_authenticated/admin.tsx",
 '        {tab === "site" ? (\n',
 '        {tab === "ordersDemo" ? (\n          <SampleOrdersAdmin />\n        ) : tab === "site" ? (\n');
