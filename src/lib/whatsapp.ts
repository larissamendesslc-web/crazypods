import { formatBRL } from "./format";

export interface WaOrderLine { name: string; flavor?: string; quantity: number; price: number }
export interface WaOrder {
  code: string;
  items: WaOrderLine[];
  total: number;
  payment_method: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  notes?: string;
  change_for?: number | null;
  shipping_fee?: number;
  delivery_minutes?: number | null;
}

export const PAYMENT_LABELS: Record<string, string> = {
  online: "Pix/cartão online",
  pix: "Pix",
  dinheiro: "Dinheiro na entrega",
  cartao: "Cartão na entrega",
};

export function normalizeWhatsapp(number: string) {
  const digits = number.replace(/\D/g, "");
  return digits.length <= 11 ? `55${digits}` : digits;
}

export function buildOrderMessage(o: WaOrder) {
  const lines = o.items.map(
    (i) => `• ${i.quantity}x ${i.name}${i.flavor ? ` (${i.flavor})` : ""} — ${formatBRL(i.price * i.quantity)}`,
  );
  return [
    `*Novo pedido Crazy #${o.code}*`,
    "",
    ...lines,
    "",
    o.shipping_fee !== undefined ? `*Frete:* ${formatBRL(Number(o.shipping_fee))}` : "",
    o.delivery_minutes ? `*Entrega estimada:* ${o.delivery_minutes} minutos` : "",
    `*Total:* ${formatBRL(o.total)}`,
    `*Pagamento:* ${PAYMENT_LABELS[o.payment_method] ?? o.payment_method}`,
    o.payment_method === "dinheiro" ? (o.change_for ? `*Troco para:* ${formatBRL(Number(o.change_for))}` : "*Troco:* não precisa") : "",
    "",
    `*Cliente:* ${o.customer_name}`,
    `*Telefone:* ${o.customer_phone}`,
    `*Endereço:* ${o.customer_address}`,
    o.notes ? `*Obs:* ${o.notes}` : "",
  ]
    .filter((l, idx, arr) => !(l === "" && arr[idx - 1] === ""))
    .join("\n")
    .trim();
}

export function buildWhatsappLink(number: string, message: string) {
  return `https://wa.me/${normalizeWhatsapp(number)}?text=${encodeURIComponent(message)}`;
}