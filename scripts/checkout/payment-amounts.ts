/**
 * CRAZY CHECKOUT — server pricing validation for the EXISTING product table.
 * No catalogue migration, new product categories, or layout changes.
 *
 * Product rows MUST come from the database, never from browser cart prices.
 * This calculation does not authorize a sale or a charge.
 */
export type CurrentProductRow = {
  id: string;
  name: string;
  price: number | string;
  sold_out: boolean;
  flavors: string[] | null;
};
export type RequestedLine = {
  product_id: string;
  flavor: string;
  quantity: number;
  // Any client-supplied price is intentionally ignored.
  expected_price?: number;
};
export type VerifiedLine = {
  productId: string;
  name: string;
  flavor: string;
  unitCents: number;
  quantity: number;
  totalCents: number;
};
export type Calculation =
  | { ok: true; currency: "BRL"; lines: VerifiedLine[]; subtotalCents: number }
  | { ok: false; reason: string };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function toCents(value: number | string): number | null {
  const source = typeof value === "number" ? value.toString() : value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(source)) return null;
  const [integer, fraction = ""] = source.split(".");
  const cents = Number(integer) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 && cents <= 100000000 ? cents : null;
}
export function calculateCurrentSubtotal(
  request: unknown,
  catalogRows: CurrentProductRow[],
): Calculation {
  if (!Array.isArray(request) || request.length < 1 || request.length > 80)
    return { ok: false, reason: "Escolha de 1 a 80 itens para o cálculo." };
  if (!Array.isArray(catalogRows)) return { ok: false, reason: "Catálogo indisponível." };
  const current = new Map(catalogRows.map(row => [row.id, row]));
  const grouped = new Map<string, VerifiedLine>();
  for (const raw of request) {
    if (!raw || typeof raw !== "object") return { ok: false, reason: "Item inválido." };
    const line = raw as Partial<RequestedLine>;
    if (typeof line.product_id !== "string" || !uuid.test(line.product_id) ||
        typeof line.flavor !== "string" || line.flavor.length > 100 ||
        !Number.isSafeInteger(line.quantity) || line.quantity! < 1 || line.quantity! > 100)
      return { ok: false, reason: "Identificador, opção ou quantidade inválidos." };
    const item = current.get(line.product_id);
    if (!item || item.sold_out) return { ok: false, reason: "Um item está indisponível." };
    const options = item.flavors ?? [];
    if (options.length && !options.includes(line.flavor))
      return { ok: false, reason: "Opção do produto não disponível." };
    if (!options.length && line.flavor !== "")
      return { ok: false, reason: "Opção não cadastrada para o produto." };
    const cents = toCents(item.price);
    if (!cents) return { ok: false, reason: "Preço cadastrado inválido." };
    const key = item.id + ":" + line.flavor;
    const previous = grouped.get(key);
    const qty = (previous?.quantity ?? 0) + line.quantity!;
    if (qty > 100) return { ok: false, reason: "Quantidade do produto excedida." };
    grouped.set(key, {
      productId: item.id, name: item.name, flavor: line.flavor,
      unitCents: cents, quantity: qty, totalCents: qty * cents,
    });
  }
  const lines = [...grouped.values()];
  const subtotalCents = lines.reduce((sum, line) => sum + line.totalCents, 0);
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents > 100000000)
    return { ok: false, reason: "Total acima do permitido." };
  return { ok: true, currency: "BRL", lines, subtotalCents };
}

export function calculateOrderTotal(subtotalCents: number, shippingCents: number) {
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0 ||
      !Number.isSafeInteger(shippingCents) || shippingCents < 0 ||
      shippingCents > 2000000 || subtotalCents > 100000000 ||
      subtotalCents + shippingCents > 100000000)
    throw new Error("O subtotal ou o frete informado não é válido.");
  return subtotalCents + shippingCents;
}
