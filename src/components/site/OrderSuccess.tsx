import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { settingsQuery, type Order } from "@/lib/queries";
import { formatBRL } from "@/lib/format";
import { buildOrderMessage, buildWhatsappLink, type WaOrderLine } from "@/lib/whatsapp";
import { OrderTracking } from "@/components/delivery/OrderTracking";

export function OrderSuccess({ order }: { order: Order }) {
  const { data: settings } = useQuery(settingsQuery);
  const items = order.items as unknown as WaOrderLine[];
  const link = buildWhatsappLink(
    order.delivery_whatsapp || settings?.whatsapp || "5511986825360",
    buildOrderMessage({ ...order, items, total: Number(order.total), change_for: order.change_for }),
  );
  return (
    <div className="mx-auto max-w-lg animate-rise px-4 py-12 text-center">
      <CheckCircle2 className="mx-auto h-16 w-16 text-primary" strokeWidth={1.5} />
      <h1 className="mt-4 text-3xl font-black">{order.payment_method === "online" ? "Pagamento aprovado!" : "Pedido confirmado!"}</h1>
      <p className="mt-2 text-muted-foreground">Código <span className="font-display font-bold text-foreground">#{order.code}</span> • {formatBRL(Number(order.total))}</p>
      {order.delivery_quote_id && <div className="mt-4 space-y-1 border-y py-4 text-sm text-muted-foreground"><p>Produtos {formatBRL(Number(order.subtotal))} + frete {formatBRL(Number(order.shipping_fee))}</p><p>{order.customer_address}</p><p>Entrega estimada: {order.delivery_minutes} minutos</p></div>}
      <OrderTracking orderId={order.id} status={order.status} />

      {order.payment_method === "dinheiro" && (
        <p className="mt-4 rounded-2xl border bg-card p-4 text-sm">
          {order.change_for ? <>Troco para {formatBRL(Number(order.change_for))}: <b>{formatBRL(Number(order.change_for) - Number(order.total))}</b></> : "Pagamento em dinheiro, sem troco."}
        </p>
      )}

      <Button asChild variant="neon" size="xl" className="mt-8 w-full">
        <a href={link} target="_blank" rel="noopener noreferrer"><MessageCircle /> Enviar pedido no WhatsApp</a>
      </Button>
      <Button asChild variant="glass" size="lg" className="mt-3 w-full"><Link to="/conta">Ver meus pedidos</Link></Button>
    </div>
  );
}