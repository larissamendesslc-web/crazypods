import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { cepSchema, deliverySettingsSchema, destinationAddress, destinationSchema, withinDeliveryArea, nearestDeliveryStore } from "@/lib/delivery";

export const lookupDeliveryCep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { zip: string }) => z.object({ zip: cepSchema }).parse(data))
  .handler(async ({ data }) => {
    // Postal address lookup is independent of the store origin and shipping settings.
    // Only quoteDelivery accesses those settings and computes authenticated freight.
    try {
      const response = await fetch(`https://viacep.com.br/ws/${data.zip}/json/`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) return { error: "Não foi possível consultar o CEP. Tente novamente." };
      const result = z.object({ erro: z.union([z.boolean(), z.string()]).optional(), cep: z.string().optional(), logradouro: z.string().max(180).optional(), bairro: z.string().max(100).optional(), localidade: z.string().max(100).optional(), uf: z.string().regex(/^[A-Z]{2}$/).optional() }).parse(await response.json());
      if (result.erro || !result.localidade || !result.uf || result.cep?.replace(/\D/g, "") !== data.zip) return { error: "CEP não encontrado. Confira os oito dígitos." };
      return { zip: data.zip, street: result.logradouro ?? "", neighborhood: result.bairro ?? "", city: result.localidade, state: result.uf };
    } catch {
      return { error: "Não foi possível consultar o CEP. Tente novamente." };
    }
  });

export const quoteDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => destinationSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { deliverySettings, geocodeDeliveryPostalCode, cachedPostalRoutes, mapsRequest, quoteResult } = await import("@/lib/delivery.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const settings = await deliverySettings(supabaseAdmin);
    const address = destinationAddress(data);
    // Stored quotes predate the CEP-only rule and do not record their calculation basis.
    // Never reuse them for new calculations; leave existing orders and quotes untouched.
    // The complete address stays on the quote/order; freight uses only the CEP centroid.
    const destination = await geocodeDeliveryPostalCode(data.zip);
    const { lat, lng } = destination.geometry.location;
    const origins = [{ store: 1, lat: settings.origin_lat, lng: settings.origin_lng }];
    if (settings.second_origin_address && settings.second_origin_lat !== null && settings.second_origin_lng !== null) origins.push({ store: 2, lat: settings.second_origin_lat, lng: settings.second_origin_lng });
    // At most two authenticated route calls; both must succeed to establish the nearest store.
    const routeKey = JSON.stringify([data.zip, settings.updated_at, origins]);
    const routes = await cachedPostalRoutes(routeKey, () => Promise.all(origins.map(async (origin) => {
    const result = await mapsRequest<{ routes?: { distanceMeters?: number; duration?: string }[] }>("/routes/directions/v2:computeRoutes", {
      method: "POST",
      headers: { "X-Goog-FieldMask": "routes.distanceMeters,routes.duration" },
      body: JSON.stringify({ origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } }, destination: { location: { latLng: { latitude: lat, longitude: lng } } }, travelMode: "DRIVE", routingPreference: "TRAFFIC_UNAWARE", computeAlternativeRoutes: false }),
    });
    const route = result.routes?.[0];
    if (!route || !route.duration || !/^\d+(\.\d+)?s$/.test(route.duration)) throw new Error("Não foi possível calcular um percurso até este endereço");
    const meters = route.distanceMeters ?? 0;
    const seconds = Number(route.duration.slice(0, -1));
    if (!Number.isInteger(meters) || meters < 0 || !Number.isFinite(seconds) || seconds < 0) throw new Error("Percurso inválido");
    return { store: origin.store, meters, seconds };
    })));
    const { store, meters, seconds } = nearestDeliveryStore(routes);
    if (!withinDeliveryArea(meters, Number(settings.max_km))) throw new Error("Este endereço está fora da área de entrega");
    // Only verified Google distances can be written; customers have no INSERT grant on quotes.
    const { data: quote, error } = await supabaseAdmin.from("delivery_quotes").insert({ user_id: context.userId, customer_address: address, zip: data.zip, distance_meters: meters, travel_seconds: seconds, origin_store: store, settings_version: settings.updated_at }).select("*").single();
    if (error) throw error;
    return quoteResult(quote, settings);
  });

export const saveDeliverySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => deliverySettingsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("Acesso restrito ao administrador");
    const { data: existing, error: readError } = await context.supabase.from("delivery_settings").select("*").eq("id", 1).maybeSingle();
    if (readError) throw readError;
    const resolve = async (zip: string) => {
      const response = await fetch(`https://viacep.com.br/ws/${zip}/json/`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error("Não foi possível consultar o CEP da loja");
      const postal = z.object({ cep: z.string(), logradouro: z.string(), bairro: z.string(), localidade: z.string(), uf: z.string().length(2) }).safeParse(await response.json());
      if (!postal.success || postal.data.cep.replace(/\D/g, "") !== zip) throw new Error("CEP da loja não encontrado");
      const { geocodeDeliveryPostalCode } = await import("@/lib/delivery.server");
      const geo = await geocodeDeliveryPostalCode(zip);
      return { address: [postal.data.logradouro, postal.data.bairro, `${postal.data.localidade} - ${postal.data.uf}`, zip].filter(Boolean).join(", "), ...geo.geometry.location };
    };
    const first = existing?.origin_zip === data.origin_zip ? { address: existing.origin_address, lat: existing.origin_lat, lng: existing.origin_lng } : await resolve(data.origin_zip);
    const second = existing?.second_origin_zip === data.second_origin_zip && existing.second_origin_lat != null && existing.second_origin_lng != null ? { address: existing.second_origin_address, lat: existing.second_origin_lat, lng: existing.second_origin_lng } : await resolve(data.second_origin_zip);
    const { error } = await context.supabase.from("delivery_settings").upsert({ id: 1, ...data, origin_address: first.address, second_origin_address: second.address, origin_lat: first.lat, origin_lng: first.lng, second_origin_lat: second.lat, second_origin_lng: second.lng, updated_at: new Date().toISOString() });
    if (error) throw error;
    return { saved: true };
  });