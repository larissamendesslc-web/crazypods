import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateCurrentSubtotal, calculateOrderTotal, toCents } from "./payment-amounts.ts";
const idA = "f2be2d48-f444-438d-af3b-e15f401d10c3";
const idB = "ad4618fe-4f9c-4a7e-84c2-b6c77d56ff19";
const products = [
  { id: idA, name: "Capa transparente", price: "29.90", sold_out: false, flavors: [] },
  { id: idB, name: "Fone estéreo", price: 89.9, sold_out: false, flavors: ["Preto", "Branco"] },
];
test("monetary calculations convert BRL decimals to exact centavos", () => {
  assert.equal(toCents("29.90"), 2990);
  assert.equal(toCents(89.9), 8990);
  assert.equal(toCents("29.999"), null);
  assert.equal(toCents(-1), null);
});
test("product prices always come from the current catalogue, not the browser", () => {
  const result = calculateCurrentSubtotal([
    { product_id: idA, flavor: "", quantity: 2, expected_price: 0.01 },
    { product_id: idB, flavor: "Preto", quantity: 1, expected_price: 5000 },
  ], products);
  assert.equal(result.ok, true);
  if(result.ok) {
    assert.equal(result.subtotalCents, 14970);
    assert.equal(result.lines[0].unitCents, 2990);
    assert.equal(result.lines[1].unitCents, 8990);
  }
});
test("cart changes reflect new price on next server validation", () => {
  const first = calculateCurrentSubtotal([{ product_id: idA, flavor: "", quantity: 1 }], products);
  const newer = calculateCurrentSubtotal([{ product_id: idA, flavor: "", quantity: 1 }], [
    { ...products[0], price: "39.90" },
  ]);
  assert.equal(first.ok && first.subtotalCents, 2990);
  assert.equal(newer.ok && newer.subtotalCents, 3990);
});
test("unavailable products, invalid options and zero quantities are rejected", () => {
  assert.equal(calculateCurrentSubtotal([{product_id:idA,flavor:"",quantity:0}],products).ok,false);
  assert.equal(calculateCurrentSubtotal([{product_id:idA,flavor:"Azul",quantity:1}],products).ok,false);
  assert.equal(calculateCurrentSubtotal([{product_id:idB,flavor:"Roxo",quantity:1}],products).ok,false);
  assert.equal(calculateCurrentSubtotal([{product_id:idB,flavor:"Preto",quantity:1}],
    [{...products[1],sold_out:true}]).ok,false);
});
test("duplicate cart lines are aggregated without price tampering", () => {
  const result = calculateCurrentSubtotal([
    {product_id:idA,flavor:"",quantity:1},
    {product_id:idA,flavor:"",quantity:2},
  ], products);
  assert.equal(result.ok,true);
  if(result.ok){assert.equal(result.lines.length,1);assert.equal(result.subtotalCents,8970);}
});
test("subtotal + delivery fee adds in centavos and rejects invalid fee", () => {
  assert.equal(calculateOrderTotal(14970,1000),15970);
  assert.throws(()=>calculateOrderTotal(14970,-1));
  assert.throws(()=>calculateOrderTotal(14970,Number.NaN));
});
