import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateDemoRoadRoutes } from "./route-demo.ts";

const stores = [
  { id: "quitauna", coordinates: { latitude: -23.53, longitude: -46.79 } },
  { id: "jardimBoaVista", coordinates: { latitude: -23.57, longitude: -46.75 } },
];
const destination = { latitude: -23.55, longitude: -46.77 };

test("route matrix sends one request and maps each origin's road kilometers", async () => {
  const old = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls++;
    assert.match(String(url), /\/table\/v1\/driving\//);
    assert.match(String(url), /sources=0;1&destinations=2/);
    return {
      ok: true,
      json: async () => ({ code: "Ok", distances: [[3500], [9200]], durations: [[500], [1230]] }),
    };
  };
  try {
    const result = await calculateDemoRoadRoutes(stores, destination);
    assert.equal(calls, 1);
    assert.deepEqual(result.map(r => r.km), [3.5, 9.2]);
    assert.deepEqual(result.map(r => r.minutes), [9, 21]);
  } finally { globalThis.fetch = old; }
});

test("missing routes do not silently use straight-line distance", async () => {
  const old = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ code: "Ok", distances: [[null]], durations: [[null]] }),
  });
  try {
    await assert.rejects(
      () => calculateDemoRoadRoutes(stores.slice(0, 1), destination),
      /Não existe rota disponível/,
    );
  } finally { globalThis.fetch = old; }
});

test("bad geolocation fails before sending any request", async () => {
  await assert.rejects(
    () => calculateDemoRoadRoutes(stores, { latitude: Number.NaN, longitude: -46.5 }),
    /Coordenadas não disponíveis/,
  );
});
