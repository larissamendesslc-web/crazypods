import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Clock, MapPin, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deliveryQuery } from "@/lib/tracking-queries";
import { DELIVERY_STATES, canShareLocation, locationFresh } from "@/lib/tracking";
import { useAuth } from "@/lib/auth";
const TrackingMap = lazy(() => import("./TrackingMap"));
export function OrderTracking({ orderId, status }: { orderId: string; status: string }) {
  const { user } = useAuth();
  const order = useQuery({ queryKey: ["tracking-order", orderId, user?.id], enabled: !!user, queryFn: async () => {
    const { data, error } = await supabase.from("orders").select("status").eq("id", orderId).maybeSingle(); if (error) throw error; return data;
  }, refetchInterval: 10000 });
  const currentStatus = order.data?.status ?? status;
  const delivery = useQuery(deliveryQuery(orderId));
  const active = canShareLocation(delivery.data?.state ?? "", currentStatus);
  const location = useQuery({ queryKey: ["delivery-location", orderId], enabled: active, queryFn: async () => {
    const { data, error } = await supabase.from("delivery_locations").select("*").eq("order_id", orderId).maybeSingle(); if (error) throw error; return data;
  }, refetchInterval: active ? 10_000 : false });
  const state = currentStatus === "cancelado" ? "cancelado" : currentStatus === "entregue" ? "entregue" : delivery.data?.state ?? "atribuido";
  const step = state === "entregue" ? 2 : state === "em_rota" ? 1 : 0;
  return <section className="my-6 space-y-4 border-y py-5 text-left">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-sm font-bold">Sua entrega</h2><span className="text-sm font-bold text-primary">{currentStatus === "pendente" ? "Pedido recebido" : DELIVERY_STATES[state]}</span></div>
    <ol className="grid grid-cols-3 gap-2">{[{ label: "Em preparo", Icon: Clock }, { label: "A caminho", Icon: Truck }, { label: "Entregue", Icon: Check }].map(({ label, Icon }, i) => <li key={label} className={`flex flex-col gap-2 border-t-2 pt-3 text-xs ${i <= step && state !== "cancelado" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}><Icon className="h-5 w-5" />{label}</li>)}</ol>
    {delivery.error && <p role="alert" className="text-sm text-destructive">Não foi possível atualizar a entrega.</p>}
    {delivery.data && <p className="text-sm text-muted-foreground">Motoboy: <span className="font-semibold text-foreground">{delivery.data.courier_name}</span></p>}
    {state === "problema" && <p className="text-sm text-destructive">A loja está verificando uma ocorrência na sua entrega.</p>}
    {active && (location.data ? <>
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-4 w-4" />{locationFresh(location.data.recorded_at) ? "Localização atualizada" : "Localização desatualizada"} · {new Date(location.data.recorded_at).toLocaleTimeString("pt-BR")} · precisão {Math.round(location.data.accuracy)} m</p>
      <ClientOnly fallback={<p className="text-sm text-muted-foreground">Carregando mapa...</p>}><Suspense fallback={<p className="text-sm text-muted-foreground">Carregando mapa...</p>}><TrackingMap latitude={location.data.latitude} longitude={location.data.longitude} /></Suspense></ClientOnly>
    </> : <p role="status" className="text-sm text-muted-foreground">{location.error ? "Não foi possível atualizar a localização." : "Aguardando localização do motoboy."}</p>)}
  </section>;
}