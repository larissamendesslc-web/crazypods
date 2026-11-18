import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminOrdersQuery } from "@/lib/admin-queries";
import { formatBRL } from "@/lib/format";
import { PAYMENT_LABELS, buildWhatsappLink } from "@/lib/whatsapp";
import { ORDER_STATUSES, STATUS_STYLES } from "@/components/site/status";
import { PageTitle } from "@/components/admin/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminHead } from "@/lib/admin-head";
import { AssignCourier } from "@/components/delivery/AssignCourier";
import { deliveriesQuery } from "@/lib/tracking-queries";
import { canAssignDelivery, DELIVERY_STATES } from "@/lib/tracking";
import { OrderTracking } from "@/components/delivery/OrderTracking";

export const Route = createFileRoute("/admin/pedidos")({ head: () => adminHead("Pedidos", "Acompanhe compras e entregas da Crazy."), component: Orders });

function Orders() {
  const { data: orders = [] } = useQuery(adminOrdersQuery);
  const { data: deliveries = [] } = useQuery(deliveriesQuery);
  const qc = useQueryClient();
  const [filter, setFilter] = useState("todos");
  const list = filter === "todos" ? orders : orders.filter((o) => o.status === filter);

  const change = async (id: string, status: string) => {
    const { error } = await supabase.rpc("set_order_status", { _order_id: id, _status: status });
    if (error) toast.error(error.message);
    else { toast.success(status === "pago" ? "Pago — entrada registrada no caixa" : status === "cancelado" ? "Cancelado — estoque devolvido" : "Status atualizado"); qc.invalidateQueries({ queryKey: ["admin"] }); }
  };

  return (
    <>
      <PageTitle title="Pedidos" sub="Marcar como pago lança a entrada no financeiro; cancelar devolve o estoque." />
      <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none">
        {["todos", ...ORDER_STATUSES].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-bold capitalize ${filter === s ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{s}</button>
        ))}
      </div>
      <div className="space-y-3">
        {list.map((o) => (
          <div key={o.id} className="rounded-3xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-bold">#{o.code} <span className="text-base text-primary">{formatBRL(Number(o.total))}</span></p>
                <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")} • {PAYMENT_LABELS[o.payment_method]}</p>
              </div>
              <Select value={o.status} onValueChange={(v) => change(o.id, v)}>
                <SelectTrigger className={`w-36 rounded-full font-bold capitalize ${STATUS_STYLES[o.status]}`}><SelectValue /></SelectTrigger>
                <SelectContent>{ORDER_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <ul className="space-y-1">
                {(o.items as unknown as { name: string; flavor: string; quantity: number; price: number }[]).map((i, idx) => (
                  <li key={idx}>{i.quantity}x {i.name}{i.flavor && <span className="text-muted-foreground"> • {i.flavor}</span>} <span className="text-muted-foreground">— {formatBRL(i.price * i.quantity)}</span></li>
                ))}
              </ul>
              <div className="text-muted-foreground">
                <p className="font-semibold text-foreground">{o.customer_name}</p>
                <p>{o.customer_phone}</p>
                <p>{o.customer_address}</p>
                {canAssignDelivery(o.status, o.payment_method) && <AssignCourier orderId={o.id} current={deliveries.find((d) => d.order_id === o.id)?.courier_id} />}
                {deliveries.find((d) => d.order_id === o.id) && <p className="mt-2 text-xs text-primary">{deliveries.find((d) => d.order_id === o.id)?.courier_name} · {DELIVERY_STATES[deliveries.find((d) => d.order_id === o.id)?.state ?? "atribuido"]}</p>}
                {o.status === "enviado" && <OrderTracking orderId={o.id} status={o.status} />}
                {o.delivery_quote_id && <p className="mt-1 text-primary">Frete {formatBRL(Number(o.shipping_fee))} · {((o.delivery_distance_meters ?? 0) / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km · {o.delivery_minutes} min</p>}
                {o.notes && <p className="mt-1 italic">“{o.notes}”</p>}
                {o.customer_phone && (
                  <a href={buildWhatsappLink(o.customer_phone, `Olá ${o.customer_name.split(" ")[0]}! Sobre seu pedido Crazy #${o.code}...`)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 font-bold text-primary">
                    <MessageCircle className="h-4 w-4" /> Falar com cliente
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="rounded-3xl border border-dashed p-12 text-center text-muted-foreground">Nenhum pedido.</div>}
      </div>
    </>
  );
}