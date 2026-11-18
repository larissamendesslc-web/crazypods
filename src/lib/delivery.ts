import { z } from "zod";

export const cepSchema = z.string().transform((v) => v.replace(/\D/g, "")).pipe(z.string().regex(/^\d{8}$/, "Informe um CEP com 8 dígitos"));
export const deliverySettingsSchema = z.object({
  enabled: z.boolean(),
  origin_zip: cepSchema,
  second_origin_zip: cepSchema,
  origin_whatsapp: z.string().transform((v) => v.replace(/\D/g, "")).pipe(z.string().regex(/^(?:55)?\d{10,11}$/, "Informe WhatsApp com DDD")),
  second_origin_whatsapp: z.string().transform((v) => v.replace(/\D/g, "")).pipe(z.string().regex(/^(?:55)?\d{10,11}$/, "Informe WhatsApp com DDD")),
  base_fee: z.number().finite().min(0).max(10000),
  per_km: z.number().finite().min(0).max(1000),
  max_km: z.number().finite().positive().max(500),
  preparation_minutes: z.number().int().min(0).max(1440),
});
export type DeliverySettingsInput = z.infer<typeof deliverySettingsSchema>;
export const destinationSchema = z.object({
  zip: cepSchema,
  street: z.string().trim().min(2).max(180),
  number: z.string().trim().min(1, "Informe o número").max(20),
  complement: z.string().trim().max(80),
  neighborhood: z.string().trim().max(100),
  city: z.string().trim().min(2).max(100),
  state: z.string().regex(/^[A-Z]{2}$/),
});
export type Destination = z.infer<typeof destinationSchema>;
export const deliveryPostalAddress = (zip: string) => `${cepSchema.parse(zip)}, Brasil`;
export function matchesDeliveryPostalCode(zip: string, geo: { partial_match?: boolean; address_components: { long_name: string; types: string[] }[] }) {
  const postal = geo.address_components.find((part) => part.types.includes("postal_code"))?.long_name.replace(/\D/g, "");
  return !geo.partial_match && postal === cepSchema.parse(zip);
}
export type DeliveryQuote = { id: string; shippingFee: number; distanceMeters: number; minutes: number; expiresAt: string; address: string };
export const shippingFee = (base: number, perKm: number, meters: number) => Math.round((base + perKm * meters / 1000 + Number.EPSILON) * 100) / 100;
export const deliveredTotal = (subtotal: number, fee: number) => Math.round((subtotal + fee) * 100) / 100;
export const deliveryMinutes = (preparation: number, seconds: number) => preparation + Math.ceil(seconds / 60);
export const withinDeliveryArea = (meters: number, maxKm: number) => meters <= maxKm * 1000;
export function nearestDeliveryStore<T extends { meters: number; store: number }>(routes: T[]): T {
  const nearest = [...routes].sort((a, b) => a.meters - b.meters || a.store - b.store)[0];
  if (!nearest) throw new Error("Não foi possível calcular um percurso até este endereço");
  return nearest;
}
export const destinationAddress = (d: Destination) => [d.street, d.number, d.complement, d.neighborhood, `${d.city} - ${d.state}`, d.zip, "Brasil"].filter(Boolean).join(", ");