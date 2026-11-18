import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bike, Check, LocateFixed, LogOut, Navigation, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deliveriesQuery } from "@/lib/tracking-queries";
import { DELIVERY_STATES } from "@/lib/tracking";
export const Route = createFileRoute("/entregador")({ head: () => ({ meta: [
  { title: "Entregador — Crazy" }, { name: "description", content: "Entregas atribuídas aos motoboys da Crazy." }, { property: "og:title", content: "Entregador — Crazy" }, { property: "og:description", content: "Acompanhe suas entregas Crazy." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
]}), component: CourierPage });
function CourierPage() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  return <main className="mx-auto min-h-screen max-w-3xl px-4 py-8"><h1 className="mb-6 flex items-center gap-3 font-display text-2xl font-bold"><Bike className="text-primary" /> Crazy · Entregas</h1>{user ? <CourierDashboard userId={user.id} /> : <CourierLogin />}</main>;
}
function CourierLogin() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false);
  return <form className="max-w-sm space-y-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); if (error) toast.error("E-mail ou senha incorretos"); setBusy(false); }}><label className="block space-y-2"><span>E-mail</span><Input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><label className="block space-y-2"><span>Senha</span><Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label><Button type="submit" disabled={busy} variant="neon">Entrar</Button></form>;
}
function CourierDashboard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const courier = useQuery({ queryKey: ["me", "courier", userId], queryFn: async () => { const { data, error } = await supabase.from("couriers").select("*").eq("user_id", userId).maybeSingle(); if (error) throw error; return data; }, refetchInterval: 15000 });
  const orders = useQuery({ queryKey: ["me", "courier-orders", userId], enabled: !!courier.data?.active, queryFn: async () => { const { data, error } = await supabase.rpc("courier_orders"); if (error) throw error; return data; }, refetchInterval: 15_000 });
  const deliveries = useQuery({ ...deliveriesQuery, enabled: !!courier.data?.active });
  const [tracking, setTracking] = useState<string | null>(null); const [gpsMessage, setGpsMessage] = useState(""); const [issue, setIssue] = useState(""); const [issueOrder, setIssueOrder] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const latest = useRef<GeolocationPosition | null>(null);
  const watch = useRef<number | null>(null);
  const stop = () => { if (watch.current !== null) navigator.geolocation.clearWatch(watch.current); watch.current = null; latest.current = null; setTracking(null); };
  useEffect(() => {
    if (!tracking) return;
    if (!navigator.geolocation) { setGpsMessage("Este celular não disponibilizou a localização."); return; }
    let disposed = false; let sending = false;
    watch.current = navigator.geolocation.watchPosition((p) => { latest.current = p; }, (e) => { setGpsMessage(e.code === 1 ? "Permissão de localização negada." : "Não foi possível obter a localização."); }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
    const send = async () => {
      if (!latest.current || sending || disposed || Date.now() - latest.current.timestamp > 30_000) return;
      sending = true; const { latitude, longitude, accuracy } = latest.current.coords;
      const { error } = await supabase.rpc("update_delivery_location", { _order_id: tracking, _latitude: latitude, _longitude: longitude, _accuracy: accuracy });
      if (!disposed) setGpsMessage(error ? "Localização não enviada. Verifique a conexão e a entrega." : `Localização enviada às ${new Date().toLocaleTimeString("pt-BR")}`);
      sending = false;
    };
    const timer = window.setInterval(() => { void send(); }, 10_000);
    return () => { disposed = true; clearInterval(timer); if (watch.current !== null) navigator.geolocation.clearWatch(watch.current); watch.current = null; latest.current = null; };
  }, [tracking]);
  useEffect(() => { if (tracking && ((!courier.data?.active) || (deliveries.data && !deliveries.data.some((d) => d.order_id === tracking && d.state === "em_rota")))) setTracking(null); }, [tracking, deliveries.data, courier.data?.active]);
  const action = async (orderId: string, kind: string) => {
    if (kind === "complete" && !window.confirm("Confirma que entregou o pedido e recebeu o dinheiro, se aplicável?")) return;
    setBusy(true);
    const { error } = await supabase.rpc("courier_delivery_action", { _order_id: orderId, _action: kind, _issue: kind === "issue" ? issue : "" });
    if (error) toast.error(error.message); else { if (kind !== "start") stop(); setIssueOrder(null); setIssue(""); await qc.invalidateQueries({ queryKey: ["me", "courier-orders"] }); await qc.invalidateQueries({ queryKey: ["deliveries"] }); if (kind === "start") { setTracking(orderId); setGpsMessage("Aguardando permissão e sinal de localização..."); } toast.success("Entrega atualizada"); }
    setBusy(false);
  };
  return <>
    <div className="mb-6 flex items-center justify-between gap-3"><span className="text-muted-foreground">{courier.data?.name}</span><Button variant="ghost" onClick={async () => { stop(); await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); }}><LogOut className="h-4 w-4" /> Sair</Button></div>
    {courier.isPending ? <p>Carregando...</p> : courier.error ? <p role="alert">Não foi possível consultar seu acesso.</p> : !courier.data?.active ? <div className="space-y-3 text-sm text-muted-foreground">
        <p>Esta conta não está cadastrada como motoboy.</p>
        <p>Para testar entregas sem sair da sua conta de cliente ou administrador, abra a página do entregador em uma aba privada do navegador e entre com a conta do motoboy.</p>
        <Button variant="outline" onClick={() => void supabase.auth.signOut()}>Trocar de conta</Button>
      </div> : <>
      {tracking && <div className="mb-6 border-y py-4"><p className="flex items-center gap-2 font-bold text-primary"><LocateFixed className="h-5 w-5" /> Localização compartilhada</p><p role="status" className="mt-2 text-sm text-muted-foreground">{gpsMessage}</p><Button className="mt-3" variant="outline" onClick={stop}>Parar compartilhamento</Button></div>}
      {orders.error && <p role="alert" className="text-destructive">Não foi possível carregar as entregas.</p>}
      <div className="space-y-4">{orders.data?.map((o) => { const d = deliveries.data?.find((x) => x.order_id === o.id); return <article key={o.id} className="space-y-4 rounded-lg border bg-card p-5"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-display font-bold">#{o.code}</h2><span className="text-sm font-bold text-primary">{DELIVERY_STATES[d?.state ?? "atribuido"]}</span></div><p className="font-semibold">{o.customer_name}</p><p className="text-sm text-muted-foreground">{o.customer_address}</p><a className="text-sm text-primary" href={`tel:${o.customer_phone}`}>{o.customer_phone}</a><p className="text-sm">{formatBRL(Number(o.total))} · {o.payment_method === "dinheiro" ? `Dinheiro${o.change_for ? ` · troco para ${formatBRL(Number(o.change_for))}` : " · sem troco"}` : "Pago online"}</p>{o.notes && <p className="text-sm text-muted-foreground">{o.notes}</p>}{d?.issue && <p className="text-sm text-destructive">{d.issue}</p>}
        <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><a target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(o.customer_address)}&travelmode=driving`}><Navigation className="h-4 w-4" /> Rota</a></Button>{d?.state === "em_rota" ? <><Button disabled={busy} variant="neon" onClick={() => action(o.id, "complete")}><Check className="h-4 w-4" /> Entregue</Button>{tracking !== o.id && <Button variant="outline" onClick={() => { setTracking(o.id); setGpsMessage("Aguardando sinal de localização..."); }}><LocateFixed className="h-4 w-4" /> Compartilhar localização</Button>}</> : <Button disabled={busy} variant="neon" onClick={() => action(o.id, "start")}><Bike className="h-4 w-4" /> Iniciar entrega</Button>}<Button variant="outline" onClick={() => setIssueOrder(o.id)}><AlertTriangle className="h-4 w-4" /> Ocorrência</Button></div>
        {issueOrder === o.id && <div className="flex flex-wrap gap-2"><Input aria-label="Ocorrência" maxLength={300} placeholder="Cliente ausente, endereço não encontrado..." value={issue} onChange={(e) => setIssue(e.target.value)} /><Button disabled={busy || issue.trim().length < 3} onClick={() => action(o.id, "issue")}>Registrar</Button></div>}
      </article>; })}</div>{orders.data?.length === 0 && <p className="py-10 text-center text-muted-foreground">Nenhuma entrega atribuída.</p>}
    </>}
  </>;
}