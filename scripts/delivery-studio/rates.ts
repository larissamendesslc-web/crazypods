/**
 * CRAZY DELIVERY 2.0 — engine for INTERNAL, FICTIONAL delivery simulations.
 * No checkout, billing, ordering or real-world carrier integrations.
 */
export type StoreKey = "quitauna" | "jardimBoaVista";
export type PaymentDemo = "pix" | "card" | "cash";
export type DeliveryBand = { upToKm: number; fee: number };
export type DeliveryZone = { city: string; neighborhood: string; fee: number };
export type DeliveryPolicy = {
  enabled: boolean;
  maxDistanceKm: number;
  freeAbove: number | null;
  bands: DeliveryBand[];
  zones?: DeliveryZone[];
  paymentDemos: PaymentDemo[];
};
export type DeliveryStudioConfig = Record<StoreKey, DeliveryPolicy>;
export type DeliveryQuote =
  | { status: "ok"; fee: number; total: number; band: DeliveryBand; free: boolean }
  | { status: "outside" | "disabled" | "invalid"; reason: string };

const finite = (n: number) => Number.isFinite(n);
export const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** All values are illustrative. They are NOT actual tariffs from any merchant. */
export const exampleDeliveryConfig: DeliveryStudioConfig = {
  quitauna: {
    enabled: true,
    maxDistanceKm: 12,
    freeAbove: 150,
    bands: [
      { upToKm: 3, fee: 7 },
      { upToKm: 6, fee: 11 },
      { upToKm: 12, fee: 18 },
    ],
    zones: [],
    paymentDemos: ["pix", "card", "cash"],
  },
  jardimBoaVista: {
    enabled: true,
    maxDistanceKm: 10,
    freeAbove: 180,
    bands: [
      { upToKm: 2, fee: 6 },
      { upToKm: 5, fee: 10 },
      { upToKm: 10, fee: 16 },
    ],
    zones: [],
    paymentDemos: ["pix", "card", "cash"],
  },
};

/** Errors are surfaced in the studio; invalid configurations never produce quotations. */
export function validateDeliveryPolicy(policy: DeliveryPolicy): string | null {
  if (!finite(policy.maxDistanceKm) || policy.maxDistanceKm <= 0 || policy.maxDistanceKm > 100)
    return "A distância máxima deve estar entre 0,1 e 100 km.";
  if (policy.freeAbove !== null && (!finite(policy.freeAbove) || policy.freeAbove < 0))
    return "O limite de frete grátis precisa ser válido.";
  if (!Array.isArray(policy.bands) || policy.bands.length === 0 || policy.bands.length > 20)
    return "Configure entre 1 e 20 faixas de frete.";
  let previous = 0;
  for (const band of policy.bands) {
    if (!finite(band.upToKm) || band.upToKm <= previous || band.upToKm > 100)
      return "As faixas precisam estar em ordem crescente e ter distância válida.";
    if (!finite(band.fee) || band.fee < 0 || band.fee > 10000)
      return "As taxas devem ser valores positivos ou zero.";
    previous = band.upToKm;
  }
  if (previous < policy.maxDistanceKm)
    return "A última faixa deve cobrir toda a distância máxima.";
  if (policy.zones !== undefined) {
    if (!Array.isArray(policy.zones) || policy.zones.length > 40)
      return "Configure no máximo 40 bairros por unidade.";
    const unique = new Set<string>();
    for (const zone of policy.zones) {
      if (!zone || typeof zone.city !== "string" || typeof zone.neighborhood !== "string" ||
        zone.city.trim().length < 2 || zone.city.length > 80 ||
        zone.neighborhood.trim().length < 2 || zone.neighborhood.length > 80 ||
        !finite(zone.fee) || zone.fee < 0 || zone.fee > 10000)
        return "Confira cidade, bairro e taxa nas tarifas por região.";
      const key = normalizePlace(zone.city) + "|" + normalizePlace(zone.neighborhood);
      if (unique.has(key)) return "O mesmo bairro não pode aparecer duas vezes na mesma unidade.";
      unique.add(key);
    }
  }
  if (!Array.isArray(policy.paymentDemos) ||
      policy.paymentDemos.some(p => !["pix", "card", "cash"].includes(p)))
    return "Selecione apenas modalidades demonstrativas válidas.";
  return null;
}

export function calculateDeliveryQuote(
  policy: DeliveryPolicy,
  distanceKm: number,
  subtotal: number,
): DeliveryQuote {
  if (!policy.enabled) return { status: "disabled", reason: "Unidade desativada neste rascunho." };
  const invalid = validateDeliveryPolicy(policy);
  if (invalid) return { status: "invalid", reason: invalid };
  if (!finite(distanceKm) || distanceKm < 0 || !finite(subtotal) || subtotal < 0)
    return { status: "invalid", reason: "Informe distância e subtotal válidos." };
  if (distanceKm > policy.maxDistanceKm)
    return { status: "outside", reason: "Destino fora do raio configurado." };
  const band = policy.bands.find(row => distanceKm <= row.upToKm);
  if (!band) return { status: "outside", reason: "Não existe faixa para essa distância." };
  const free = policy.freeAbove !== null && subtotal >= policy.freeAbove;
  const fee = free ? 0 : money(band.fee);
  return { status: "ok", fee, total: money(subtotal + fee), band, free };
}


/** Exact city/neighborhood match from the postal lookup; no guessed location or rate. */
export function normalizePlace(value: string): string {
  return value.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "")
    .trim().replace(/\\s+/g, " ").toLowerCase();
}

export type ZoneDeliveryQuote = {
  status: "ok";
  fee: number;
  total: number;
  free: boolean;
  zone: DeliveryZone;
  band?: never;
};

/** An explicit merchant-configured neighborhood price can work without GPS. */
export function calculateZoneQuote(
  policy: DeliveryPolicy,
  city: string,
  neighborhood: string,
  subtotal: number,
): ZoneDeliveryQuote | null {
  if (!policy.enabled || validateDeliveryPolicy(policy) || !finite(subtotal) || subtotal < 0)
    return null;
  const normalizedCity = normalizePlace(city);
  const normalizedDistrict = normalizePlace(neighborhood);
  if (!normalizedCity || !normalizedDistrict) return null;
  const zone = (policy.zones ?? []).find(row =>
    normalizePlace(row.city) === normalizedCity &&
    normalizePlace(row.neighborhood) === normalizedDistrict);
  if (!zone) return null;
  const free = policy.freeAbove !== null && subtotal >= policy.freeAbove;
  const fee = free ? 0 : money(zone.fee);
  return { status: "ok", fee, total: money(subtotal + fee), zone, free };
}

/**
 * Read only validated demo settings. Corrupt or incompatible records fail
 * closed to independent illustrative defaults for each location.
 */
export function readDeliveryDemo(value: unknown): DeliveryStudioConfig {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
  const asPolicy = (id: StoreKey): DeliveryPolicy => {
    const candidate = raw[id];
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate))
      return { ...exampleDeliveryConfig[id], bands: exampleDeliveryConfig[id].bands.map(b => ({ ...b })), paymentDemos: [...exampleDeliveryConfig[id].paymentDemos], zones: [] };
    const p = candidate as Partial<DeliveryPolicy>;
    if (typeof p.enabled !== "boolean" || typeof p.maxDistanceKm !== "number" ||
      !(p.freeAbove === null || typeof p.freeAbove === "number") ||
      !Array.isArray(p.bands) || !Array.isArray(p.paymentDemos) ||
      p.bands.some(b => !b || typeof b.upToKm !== "number" || typeof b.fee !== "number") ||
      validateDeliveryPolicy(p as DeliveryPolicy) !== null) {
      return { ...exampleDeliveryConfig[id], bands: exampleDeliveryConfig[id].bands.map(b => ({ ...b })), paymentDemos: [...exampleDeliveryConfig[id].paymentDemos], zones: [] };
    }
    return {
      enabled: p.enabled,
      maxDistanceKm: p.maxDistanceKm,
      freeAbove: p.freeAbove,
      bands: p.bands.map(b => ({ upToKm: b.upToKm, fee: b.fee })),
      paymentDemos: [...p.paymentDemos],
      zones: (p.zones ?? []).map(z => ({ city: z.city, neighborhood: z.neighborhood, fee: z.fee })),
    };
  };
  return { quitauna: asPolicy("quitauna"), jardimBoaVista: asPolicy("jardimBoaVista") };
}
