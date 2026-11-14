/**
 * CRAZY COMMERCE — product-agnostic catalogue.
 * This file intentionally has no knowledge of product niches or of the legacy store.
 *
 * Prices are always stored as integer centavos. The browser cart never has
 * authority to set or override prices in a future real payment request.
 */
export type ShopUnit = "quitauna" | "jardimBoaVista";
export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  enabled: boolean;
  order: number;
};
export type StockByUnit = Record<ShopUnit, number>;
export type Variant = {
  id: string;
  label: string;
  sku: string;
  priceCents: number | null;
  stock: StockByUnit;
};
export type Merchandise = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  imageUrl: string;
  priceCents: number;
  compareAtCents: number | null;
  stock: StockByUnit;
  variants: Variant[];
  status: "draft" | "published" | "archived";
  createdAt: string;
  updatedAt: string;
};
export type CommerceCatalog = {
  version: 1;
  categories: Category[];
  products: Merchandise[];
};
export type ShopCartLine = { productId: string; variantId: string | null; quantity: number };
export type ResolvedCartLine = {
  key: string;
  productId: string;
  variantId: string | null;
  name: string;
  variantLabel: string | null;
  sku: string;
  unitPriceCents: number;
  quantity: number;
  totalCents: number;
};
export type CartResolution =
  | { ok: true; lines: ResolvedCartLine[]; subtotalCents: number }
  | { ok: false; reason: string };

export const emptyCommerceCatalog: CommerceCatalog = { version: 1, categories: [], products: [] };
export const supportedUnits: ShopUnit[] = ["quitauna", "jardimBoaVista"];
const slugRE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const uuidRE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const positiveMoney = (value: unknown) => typeof value === "number" &&
  Number.isSafeInteger(value) && value > 0 && value <= 100_000_000;
const optionalMoney = (value: unknown) => value === null || positiveMoney(value);
const validText = (value: unknown, min = 0, max = 200) => typeof value === "string" &&
  value.trim().length >= min && value.length <= max;
const validStock = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return supportedUnits.every(id => typeof record[id] === "number" &&
    Number.isSafeInteger(record[id]) && record[id] >= 0 && record[id] <= 1_000_000);
};

export function toSlug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}

/** For admin input; never pass client-supplied amounts to payment gateway. */
export function parseBRLCents(input: string): number | null {
  const value = input.trim().replace(/^R\$\s*/i, "");
  const form = /^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(value)
    ? value.replace(/\./g, "").replace(",", ".")
    : /^\d{1,8}(?:[.,]\d{1,2})?$/.test(value)
      ? value.replace(",", ".")
      : null;
  if (!form) return null;
  const [whole, frac = ""] = form.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 && cents <= 100_000_000 ? cents : null;
}

export function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function validateCatalog(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return "O catálogo precisa ser um objeto válido.";
  const cat = value as Partial<CommerceCatalog>;
  if (cat.version !== 1 || !Array.isArray(cat.categories) || !Array.isArray(cat.products))
    return "Versão do catálogo não suportada.";
  if (cat.categories.length > 150 || cat.products.length > 1500)
    return "O catálogo atingiu o limite da etapa inicial. Migre para as tabelas de comércio.";
  const ids = new Set<string>(), slugs = new Set<string>(), skus = new Set<string>();
  for (const c of cat.categories) {
    if (!c || !uuidRE.test(c.id) || ids.has(c.id) ||
      !validText(c.name, 2, 90) || !slugRE.test(c.slug) || slugs.has(c.slug) ||
      !validText(c.description, 0, 300) || typeof c.enabled !== "boolean" ||
      !Number.isSafeInteger(c.order) || Math.abs(c.order) > 100000)
      return "Categoria inválida ou duplicada.";
    ids.add(c.id); slugs.add(c.slug);
  }
  const productIds = new Set<string>(), productSlugs = new Set<string>();
  for (const p of cat.products) {
    if (!p || !uuidRE.test(p.id) || productIds.has(p.id) || !ids.has(p.categoryId) ||
      !validText(p.name, 2, 160) || !slugRE.test(p.slug) || productSlugs.has(p.slug) ||
      !validText(p.description, 0, 3000) || !validText(p.sku, 2, 80) || skus.has(p.sku) ||
      !validText(p.imageUrl, 0, 2000) ||
      (p.imageUrl !== "" && !/^https:\/\//.test(p.imageUrl)) ||
      !positiveMoney(p.priceCents) || !optionalMoney(p.compareAtCents) ||
      !validStock(p.stock) ||
      !["draft", "published", "archived"].includes(p.status) ||
      !Array.isArray(p.variants) || p.variants.length > 50 ||
      !validText(p.createdAt, 10, 50) || !validText(p.updatedAt, 10, 50))
      return "Produto inválido ou SKU/slug duplicado.";
    productIds.add(p.id); productSlugs.add(p.slug); skus.add(p.sku);
    const variantIds = new Set<string>();
    for (const v of p.variants) {
      if (!v || !uuidRE.test(v.id) || variantIds.has(v.id) ||
        !validText(v.label, 1, 100) || !validText(v.sku, 2, 80) ||
        skus.has(v.sku) || !optionalMoney(v.priceCents) || !validStock(v.stock))
        return "Variação inválida ou SKU duplicado.";
      variantIds.add(v.id); skus.add(v.sku);
    }
  }
  return null;
}

export function readCommerceCatalog(value: unknown): CommerceCatalog {
  if (validateCatalog(value)) return { version: 1, categories: [], products: [] };
  const input = value as CommerceCatalog;
  return {
    version: 1,
    categories: input.categories.map(c => ({ ...c })),
    products: input.products.map(p => ({
      ...p,
      stock: { ...p.stock },
      variants: p.variants.map(v => ({ ...v, stock: { ...v.stock } })),
    })),
  };
}

export function storefrontProducts(catalog: CommerceCatalog) {
  const enabled = new Set(catalog.categories.filter(c => c.enabled).map(c => c.id));
  return catalog.products.filter(p => p.status === "published" && enabled.has(p.categoryId));
}

export function resolveCart(
  catalog: CommerceCatalog, cart: ShopCartLine[], store: ShopUnit,
): CartResolution {
  if (!Array.isArray(cart) || cart.length === 0 || cart.length > 80)
    return { ok: false, reason: "Selecione de um a 80 itens." };
  const seen = new Set<string>(), lines: ResolvedCartLine[] = [];
  const products = storefrontProducts(catalog);
  for (const line of cart) {
    if (!line || typeof line.productId !== "string" ||
      !Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 100 ||
      !(line.variantId === null || typeof line.variantId === "string"))
      return { ok: false, reason: "Quantidade ou item inválido." };
    const product = products.find(p => p.id === line.productId);
    if (!product) return { ok: false, reason: "Produto indisponível no catálogo." };
    const variant = product.variants.length
      ? product.variants.find(v => v.id === line.variantId) : undefined;
    if (product.variants.length > 0 && !variant)
      return { ok: false, reason: "Selecione uma opção do produto." };
    if (product.variants.length === 0 && line.variantId !== null)
      return { ok: false, reason: "Variação não encontrada." };
    const key = product.id + ":" + (variant?.id ?? "");
    if (seen.has(key)) return { ok: false, reason: "Itens duplicados no carrinho." };
    seen.add(key);
    const stock = variant ? variant.stock[store] : product.stock[store];
    if (stock < line.quantity) return { ok: false, reason: "Quantidade acima do estoque da unidade." };
    const unitPriceCents = variant?.priceCents ?? product.priceCents;
    if (!positiveMoney(unitPriceCents))
      return { ok: false, reason: "Preço do produto inválido." };
    lines.push({
      key,
      productId: product.id,
      variantId: variant?.id ?? null,
      name: product.name,
      variantLabel: variant?.label ?? null,
      sku: variant?.sku ?? product.sku,
      unitPriceCents,
      quantity: line.quantity,
      totalCents: unitPriceCents * line.quantity,
    });
  }
  const subtotalCents = lines.reduce((sum, p) => sum + p.totalCents, 0);
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents > 100_000_000)
    return { ok: false, reason: "Subtotal excede os limites permitidos." };
  return { ok: true, lines, subtotalCents };
}
