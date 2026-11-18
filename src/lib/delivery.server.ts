import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { deliveryMinutes, deliveryPostalAddress, matchesDeliveryPostalCode, shippingFee, withinDeliveryArea, type DeliveryQuote } from "./delivery";

type GeoResult = {
  formatted_address: string;
  geometry: { location: { lat: number; lng: number }; location_type?: string };
  address_components: { long_name: string; short_name: string; types: string[] }[];
  partial_match?: boolean;
};
const geoCache = new Map<string, { value: GeoResult; expires: number }>();
type PostalRoute = { store: number; meters: number; seconds: number };
const postalRouteCache = new Map<string, { value: Promise<PostalRoute[]>; expires: number }>();
export async function cachedPostalRoutes(key: string, calculate: () => Promise<PostalRoute[]>): Promise<PostalRoute[]> {
  const cached = postalRouteCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  if (postalRouteCache.size >= 100) postalRouteCache.clear();
  const value = calculate();
  postalRouteCache.set(key, { value, expires: Date.now() + 15 * 60000 });
  try { return await value; }
  catch (error) { if (postalRouteCache.get(key)?.value === value) postalRouteCache.delete(key); throw error; }
}
export async function mapsRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = process.env["GOOGLE_MAPS_API_KEY"];
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey || !lovableKey) throw new Error("Conecte o Google Maps para calcular entregas");
  const response = await fetch(`https://connector-gateway.lovable.dev/google_maps${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": apiKey, "Content-Type": "application/json", ...init?.headers },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const body = await response.text();
    console.error(`Google Maps [${response.status}]: ${body}`);
    if (response.status === 403) {
      if (body.includes("API_KEY_HTTP_REFERRER_BLOCKED")) throw new Error("Google Maps bloqueou a consulta: a chave do servidor deve permitir chamadas sem restrição de site ou usar restrição por IP no Google Cloud.");
      if (body.includes("API_KEY_SERVICE_BLOCKED")) throw new Error("Google Maps bloqueou a consulta: habilite Geocoding API e Routes API nas permissões da chave do servidor no Google Cloud.");
      throw new Error("Google Maps negou a consulta (403). Verifique as permissões da conexão.");
    }
    throw new Error(`Não foi possível consultar Google Maps (${response.status}): ${body}`);
  }
  return response.json() as Promise<T>;
}
export async function geocode(address: string): Promise<GeoResult> {
  const cached = geoCache.get(address);
  if (cached && cached.expires > Date.now()) return cached.value;
  const result = await mapsRequest<{ status: string; results: GeoResult[]; error_message?: string }>(`/maps/api/geocode/json?address=${encodeURIComponent(address)}&components=country:BR&language=pt-BR`);
  if (result.status !== "OK" || !result.results[0]) {
    if (result.status === "ZERO_RESULTS") throw new Error("Endereço não encontrado. Confira o CEP e o endereço completo.");
    console.error(`Geocoding [${result.status}]: ${result.error_message ?? ""}`);
    throw new Error(`Consulta de endereço indisponível (${result.status})`);
  }
  const found = result.results[0];
  if (!Number.isFinite(found.geometry.location.lat) || !Number.isFinite(found.geometry.location.lng)) throw new Error("Localização indisponível");
  if (geoCache.size >= 100) geoCache.clear();
  geoCache.set(address, { value: found, expires: Date.now() + 15 * 60000 });
  return found;
}
export function addressPart(geo: GeoResult, types: string[], short = false) {
  const part = geo.address_components.find((c) => types.some((t) => c.types.includes(t)));
  return (short ? part?.short_name : part?.long_name) ?? "";
}
export async function geocodeDeliveryPostalCode(zip: string): Promise<GeoResult> {
  const geo = await geocode(deliveryPostalAddress(zip));
  // Postal centroids can be APPROXIMATE: require the requested CEP, not a house number.
  if (!matchesDeliveryPostalCode(zip, geo)) throw new Error("Não foi possível localizar este CEP para calcular o frete. Confira os oito dígitos.");
  return geo;
}
export async function deliverySettings(client: SupabaseClient<Database>) {
  const { data, error } = await client.from("delivery_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  if (!data?.enabled) throw new Error("Delivery indisponível no momento");
  return data;
}
export function quoteResult(row: Database["public"]["Tables"]["delivery_quotes"]["Row"], settings: Database["public"]["Tables"]["delivery_settings"]["Row"]): DeliveryQuote {
  if (!withinDeliveryArea(row.distance_meters, Number(settings.max_km))) throw new Error("Este endereço está fora da área de entrega");
  return { id: row.id, shippingFee: shippingFee(Number(settings.base_fee), Number(settings.per_km), row.distance_meters), distanceMeters: row.distance_meters, minutes: deliveryMinutes(settings.preparation_minutes, Number(row.travel_seconds)), expiresAt: row.expires_at, address: row.customer_address };
}