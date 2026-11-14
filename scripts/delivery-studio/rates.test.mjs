import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateDeliveryQuote,
  calculateZoneQuote,
  exampleDeliveryConfig,
  readDeliveryDemo,
  validateDeliveryPolicy,
} from "./rates.ts";

const q = exampleDeliveryConfig.quitauna;
const j = exampleDeliveryConfig.jardimBoaVista;

test("distance exactly on band boundary uses that band", () => {
  const quote = calculateDeliveryQuote(q, 3, 50);
  assert.equal(quote.status, "ok");
  if (quote.status === "ok") {
    assert.equal(quote.fee, 7);
    assert.equal(quote.total, 57);
  }
});

test("distance above boundary selects next tier", () => {
  const quote = calculateDeliveryQuote(q, 3.01, 50);
  assert.equal(quote.status, "ok");
  if (quote.status === "ok") assert.equal(quote.fee, 11);
});

test("distance beyond maximum is rejected, even with free-shipping subtotal", () => {
  assert.equal(calculateDeliveryQuote(q, 12.01, 999).status, "outside");
});

test("free delivery threshold is inclusive and applies only inside coverage", () => {
  const below = calculateDeliveryQuote(q, 4, 149.99);
  const above = calculateDeliveryQuote(q, 4, 150);
  assert.equal(below.status, "ok");
  assert.equal(above.status, "ok");
  if (below.status === "ok" && above.status === "ok") {
    assert.equal(below.fee, 11);
    assert.equal(above.fee, 0);
    assert.equal(above.total, 150);
  }
});

test("each store has independent distance and price rules", () => {
  const a = calculateDeliveryQuote(q, 2.5, 20);
  const b = calculateDeliveryQuote(j, 2.5, 20);
  assert.equal(a.status, "ok");
  assert.equal(b.status, "ok");
  if (a.status === "ok" && b.status === "ok") {
    assert.equal(a.fee, 7);
    assert.equal(b.fee, 10);
  }
});

test("disabled store never generates a price", () => {
  assert.equal(calculateDeliveryQuote({ ...q, enabled: false }, 1, 50).status, "disabled");
});

test("empty or invalid monetary inputs never generate a price", () => {
  assert.equal(calculateDeliveryQuote(q, Number.NaN, 10).status, "invalid");
  assert.equal(calculateDeliveryQuote(q, 2, -1).status, "invalid");
  assert.equal(calculateDeliveryQuote(q, -1, 10).status, "invalid");
});

test("overlapping, unsorted, missing and incomplete tiers are rejected", () => {
  assert.ok(validateDeliveryPolicy({ ...q, bands: [
    { upToKm: 3, fee: 7 }, { upToKm: 3, fee: 9 },
  ] }));
  assert.ok(validateDeliveryPolicy({ ...q, bands: [
    { upToKm: 2, fee: 7 },
  ] }));
  assert.ok(validateDeliveryPolicy({ ...q, bands: [] }));
});

test("prices cannot be negative and totals are cent-rounded", () => {
  assert.ok(validateDeliveryPolicy({ ...q, bands: [
    { upToKm: 12, fee: -2 },
  ] }));
  const quote = calculateDeliveryQuote({
    ...q, bands: [{ upToKm: 12, fee: 1.015 }],
  }, 4, 0.01);
  assert.equal(quote.status, "ok");
  if (quote.status === "ok") assert.equal(quote.total, 1.03);
});

test("valid saved demo rules are reused independently per location", () => {
  const custom = {
    ...exampleDeliveryConfig,
    quitauna: { ...exampleDeliveryConfig.quitauna, freeAbove: 90 },
  };
  assert.equal(readDeliveryDemo(custom).quitauna.freeAbove, 90);
  assert.equal(readDeliveryDemo(custom).jardimBoaVista.freeAbove,
    exampleDeliveryConfig.jardimBoaVista.freeAbove);
});

test("invalid saved settings cannot return incomplete or negative prices", () => {
  const corrupt = {
    ...exampleDeliveryConfig,
    quitauna: { ...exampleDeliveryConfig.quitauna,
      bands: [{ upToKm: 12, fee: -50 }] },
  };
  assert.deepEqual(readDeliveryDemo(corrupt).quitauna, exampleDeliveryConfig.quitauna);
  assert.deepEqual(readDeliveryDemo({}).jardimBoaVista, exampleDeliveryConfig.jardimBoaVista);
});

test("CEP neighborhood tariff takes accents and case into account", () => {
  const policy = {
    ...exampleDeliveryConfig.quitauna,
    zones: [{ city: "Osasco", neighborhood: "Quitaúna", fee: 12.4 }],
  };
  const quote = calculateZoneQuote(policy, "OSASCO", "Quitauna", 80);
  assert.equal(quote?.fee, 12.4);
  assert.equal(quote?.total, 92.4);
});

test("no neighborhood match never guesses a fee", () => {
  const policy = {
    ...exampleDeliveryConfig.quitauna,
    zones: [{ city: "Osasco", neighborhood: "Centro", fee: 5 }],
  };
  assert.equal(calculateZoneQuote(policy, "Barueri", "Centro", 25), null);
  assert.equal(calculateZoneQuote(policy, "Osasco", "Vila Yara", 25), null);
});

test("neighborhood fixed tariff honors the exact free delivery threshold", () => {
  const policy = {
    ...exampleDeliveryConfig.quitauna,
    freeAbove: 100,
    zones: [{ city: "Osasco", neighborhood: "Centro", fee: 7 }],
  };
  assert.equal(calculateZoneQuote(policy, "Osasco", "Centro", 99.99)?.fee, 7);
  assert.equal(calculateZoneQuote(policy, "Osasco", "Centro", 100)?.fee, 0);
});

test("a duplicate or invalid neighborhood configuration fails validation", () => {
  const sample = {
    ...exampleDeliveryConfig.quitauna,
    zones: [{ city: "Osasco", neighborhood: "Quitaúna", fee: 4 },
      { city: "osasco", neighborhood: "quitauna", fee: 8 }],
  };
  assert.ok(validateDeliveryPolicy(sample));
  assert.equal(calculateZoneQuote(sample, "Osasco", "Quitaúna", 50), null);
});

test("older price policy remains compatible with empty neighborhood tariff list", () => {
  const before = {
    ...exampleDeliveryConfig.quitauna,
  };
  delete before.zones;
  const parsed = readDeliveryDemo({
    ...exampleDeliveryConfig,
    quitauna: before,
  });
  assert.deepEqual(parsed.quitauna.zones, []);
});
