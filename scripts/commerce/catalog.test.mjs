import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toSlug, parseBRLCents, formatBRL, readCommerceCatalog, validateCatalog,
  storefrontProducts, resolveCart,
} from "./catalog.ts";

const categoryId = "25e483dd-58f0-4934-91ad-ec4ee7b4ca6a";
const productId = "8c9c5e27-f57c-4334-81da-3afba47c20dd";
const variantId = "dcc9d5f8-5c26-4f51-94ef-413ad456e3f9";
function sample() {
  return {
    version: 1,
    categories: [{ id: categoryId, name: "Fones de ouvido", slug: "fones-de-ouvido",
      description: "", enabled: true, order: 1 }],
    products: [{
      id: productId, categoryId, name: "Fone sem fio", slug: "fone-sem-fio",
      sku: "FONE-100", description: "Bluetooth", imageUrl: "", priceCents: 8990,
      compareAtCents: null, stock: { quitauna: 9, jardimBoaVista: 2 },
      variants: [], status: "published",
      createdAt: "2026-11-14T10:00:00.000Z", updatedAt: "2026-11-14T10:00:00.000Z",
    }],
  };
}
test("BRL prices use integer centavos", () => {
  assert.equal(parseBRLCents("89,90"), 8990);
  assert.equal(parseBRLCents("89.9"), 8990);
  assert.equal(parseBRLCents("0,01"), 1);
  assert.equal(parseBRLCents("-1"), null);
  assert.equal(parseBRLCents("1,999"), null);
  assert.equal(formatBRL(8990), "R$ 89,90".replace(" ", " "));
});
test("category labels are free-form, no niche-specific fields", () => {
  assert.equal(toSlug("Peças e Acessórios"), "pecas-e-acessorios");
  const cat = sample();
  assert.equal(validateCatalog(cat), null);
  assert.equal(storefrontProducts(cat).length, 1);
});
test("cart prices are recalculated from published catalogue", () => {
  const catalog = sample();
  const r = resolveCart(catalog, [{ productId, variantId: null, quantity: 2 }], "quitauna");
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.subtotalCents, 17980);
    assert.equal(r.lines[0].unitPriceCents, 8990);
  }
});
test("unpublished products cannot enter the cart", () => {
  const catalog = sample();
  catalog.products[0].status = "draft";
  assert.equal(resolveCart(catalog, [{ productId, variantId: null, quantity: 1 }], "quitauna").ok, false);
});
test("stock by shop prevents overselling the displayed quantity", () => {
  const catalog = sample();
  assert.equal(resolveCart(catalog, [{ productId, variantId: null, quantity: 3 }], "jardimBoaVista").ok, false);
});
test("variants override price and stock, but not when missing", () => {
  const catalog = sample();
  catalog.products[0].variants = [{
    id: variantId, label: "Preto", sku: "FONE-100-PRETO",
    priceCents: 9990, stock: { quitauna: 3, jardimBoaVista: 0 },
  }];
  assert.equal(validateCatalog(catalog), null);
  const quote = resolveCart(catalog, [{ productId, variantId, quantity: 2 }], "quitauna");
  assert.equal(quote.ok, true);
  if (quote.ok) assert.equal(quote.subtotalCents, 19980);
  assert.equal(resolveCart(catalog, [{ productId, variantId: null, quantity: 1 }], "quitauna").ok, false);
});
test("duplicate SKUs are rejected across products and variants", () => {
  const catalog = sample();
  catalog.products[0].variants = [{
    id: variantId, label: "Branco", sku: "FONE-100",
    priceCents: null, stock: { quitauna: 3, jardimBoaVista: 0 },
  }];
  assert.ok(validateCatalog(catalog));
});
test("legacy catalog data is never imported implicitly", () => {
  const result = readCommerceCatalog({
    products: [{ id: productId, name: "legacy" }], categories: [],
  });
  assert.equal(result.products.length, 0);
  assert.equal(result.categories.length, 0);
});
