import { describe, expect, it } from "vitest";
import { cepSchema, deliveredTotal, deliveryMinutes, shippingFee, withinDeliveryArea, nearestDeliveryStore, deliverySettingsSchema, deliveryPostalAddress, matchesDeliveryPostalCode, destinationAddress, destinationSchema } from "./delivery";

describe("delivery", () => {
  it("calcula a localização pelo CEP 06454-080 sem depender do número ou complemento", () => {
    const address = destinationSchema.parse({ zip: "06454-080", street: "Alameda Itapecuru", number: "515", complement: "Sala 2", neighborhood: "Alphaville", city: "Barueri", state: "SP" });
    expect(deliveryPostalAddress(address.zip)).toBe("06454080, Brasil");
    expect(destinationAddress(address)).toBe("Alameda Itapecuru, 515, Sala 2, Alphaville, Barueri - SP, 06454080, Brasil");
    expect(deliveryPostalAddress({ ...address, number: "1000", complement: "Casa" }.zip)).toBe("06454080, Brasil");
  });
  it("aceita centro aproximado do CEP e recusa CEP diferente ou correspondência parcial", () => {
    const geo = { geometry: { location_type: "APPROXIMATE" }, address_components: [{ long_name: "06454-080", types: ["postal_code"] }] };
    expect(matchesDeliveryPostalCode("06454080", geo)).toBe(true);
    expect(matchesDeliveryPostalCode("01001000", geo)).toBe(false);
    expect(matchesDeliveryPostalCode("06454080", { ...geo, partial_match: true })).toBe(false);
    expect(matchesDeliveryPostalCode("06454080", { address_components: [] })).toBe(false);
  });
  it("escolhe a segunda loja quando o percurso é menor", () => {
    expect(nearestDeliveryStore([{ store: 1, meters: 9000 }, { store: 2, meters: 3000 }]).store).toBe(2);
    expect(nearestDeliveryStore([{ store: 1, meters: 2000 }, { store: 2, meters: 7000 }]).store).toBe(1);
  });
  it("configura duas lojas apenas com CEP e WhatsApp sem endereço completo", () => {
    const input = { enabled: true, origin_zip: "01310-100", second_origin_zip: "01001-000", origin_whatsapp: "11999999999", second_origin_whatsapp: "11888888888", base_fee: 5, per_km: 2, max_km: 30, preparation_minutes: 20 };
    expect(deliverySettingsSchema.parse(input).origin_zip).toBe("01310100");
    expect(deliverySettingsSchema.safeParse({ ...input, second_origin_zip: "123" }).success).toBe(false);
  });
  it("mantém um WhatsApp independente para cada loja", () => {
    const result = deliverySettingsSchema.parse({ enabled: true, origin_zip: "01310100", second_origin_zip: "01001000", origin_whatsapp: "11999999999", second_origin_whatsapp: "11888888888", base_fee: 5, per_km: 2, max_km: 30, preparation_minutes: 20 });
    expect(result.origin_whatsapp).toBe("11999999999");
    expect(result.second_origin_whatsapp).toBe("11888888888");
  });
  it("calcula taxa base mais distância por km", () => expect(shippingFee(5, 2, 3250)).toBe(11.5));
  it("soma produtos e frete no valor a pagar e no troco", () => {
    const total = deliveredTotal(80, 11.5);
    expect(total).toBe(91.5);
    expect(100 - total).toBe(8.5);
  });
  it("inclui preparo e percurso no prazo", () => expect(deliveryMinutes(20, 601)).toBe(31));
  it("recusa distância além do alcance configurado", () => {
    expect(withinDeliveryArea(10000, 10)).toBe(true);
    expect(withinDeliveryArea(10001, 10)).toBe(false);
  });
  it("exige CEP de oito dígitos", () => {
    expect(cepSchema.parse("01310-100")).toBe("01310100");
    expect(cepSchema.safeParse("01310").success).toBe(false);
  });
});