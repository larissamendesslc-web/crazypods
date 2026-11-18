import { describe, it, expect } from "vitest";
import { canAssignDelivery, canShareLocation, locationFresh } from "./tracking";
describe("entrega própria", () => {
  it("online só pode ser atribuído após pagamento", () => { expect(canAssignDelivery("pendente", "online")).toBe(false); expect(canAssignDelivery("pago", "online")).toBe(true); });
  it("dinheiro permite atribuição antes da cobrança na entrega", () => expect(canAssignDelivery("pendente", "dinheiro")).toBe(true));
  it("pedidos encerrados não permitem atribuição", () => { expect(canAssignDelivery("entregue", "dinheiro")).toBe(false); expect(canAssignDelivery("cancelado", "online")).toBe(false); });
  it("localização somente durante trajeto ativo", () => { expect(canShareLocation("em_rota", "enviado")).toBe(true); expect(canShareLocation("em_rota", "cancelado")).toBe(false); expect(canShareLocation("entregue", "entregue")).toBe(false); });
  it("marca localização como antiga após 90 segundos", () => { expect(locationFresh("2026-11-15T00:00:00Z", Date.parse("2026-11-15T00:01:30Z"))).toBe(true); expect(locationFresh("2026-11-15T00:00:00Z", Date.parse("2026-11-15T00:01:31Z"))).toBe(false); });
});