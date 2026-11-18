import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Order } from "@/lib/queries";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { OrderSuccess } from "@/components/site/OrderSuccess";
import { OnlinePayment } from "@/components/site/OnlinePayment";
import { confirmOrderPayment } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/pedido/$id")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { session_id?: string | undefined; payment_return?: string | undefined } => ({
    session_id: typeof s["session_id"] === "string" ? (s["session_id"] as string) : undefined,
    payment_return: s["payment_return"] === "1" ? "1" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Pagamento do pedido — Crazy" },
      { name: "description", content: "Pague seu pedido Crazy com Pix ou cartão e acompanhe a confirmação." },
      { property: "og:title", content: "Pagamento do pedido — Crazy" },
      { property: "og:description", content: "Pix ou cartão com confirmação automática." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const { session_id, payment_return } = Route.useSearch();
  const { user, ready } = useAuth();
  const confirm = useServerFn(confirmOrderPayment);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const inFlight = useRef(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [confirmationError, setConfirmationError] = useState("");
  const [checking, setChecking] = useState(false);
  const [waitingLong, setWaitingLong] = useState(false);
  const q = useQuery({
    queryKey: ["order", id, user?.id ?? null],
    enabled: ready && !!user?.id,
    queryFn: async () => { const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle(); if (error) throw error; return data as Order | null; },
    refetchInterval: (query) => query.state.data && !["entregue", "cancelado"].includes(query.state.data.status) ? (session_id && query.state.data.status === "pendente" ? 2500 : 10000) : false,
  });
  const checkPayment = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setChecking(true); setConfirmationError("");
    try {
      const result = await confirm({ data: { orderId: id, sessionId: session_id, environment: getStripeEnvironment() } });
      await q.refetch();
      if (result.status !== "pendente") {
        await qc.invalidateQueries({ queryKey: ["me", "orders"] });
        await qc.invalidateQueries({ queryKey: ["admin"] });
      }
    }
    catch (e) { setConfirmationError(e instanceof Error ? e.message : "Não foi possível consultar o pagamento"); }
    finally { inFlight.current = false; setChecking(false); setInitialCheckDone(true); }
  }, [id, session_id, confirm, q.refetch, qc]);
  useEffect(() => {
    if (!user || q.data?.status !== "pendente" || q.data.payment_method !== "online") return;
    setWaitingLong(false); setInitialCheckDone(false);
    void checkPayment();
    const timer = setTimeout(() => setWaitingLong(true), 30000);
    let attempts = 0;
    const retry = session_id || payment_return ? setInterval(() => { if (++attempts <= 6) void checkPayment(); else clearInterval(retry); }, 10000) : undefined;
    return () => { clearTimeout(timer); if (retry) clearInterval(retry); };
  }, [id, session_id, payment_return, user?.id, q.data?.status, checkPayment]);

  if (!ready || q.isLoading) return <Center><Loader2 className="h-8 w-8 animate-spin text-primary" /></Center>;
  if (!user) return <Center><p>Entre na sua conta para ver o pedido.</p><Button asChild variant="neon" className="mt-4"><Link to="/conta">Entrar</Link></Button></Center>;
  if (q.error) return <Center><p role="alert">Não foi possível carregar o pedido.</p><Button onClick={() => void q.refetch()} className="mt-4">Tentar novamente</Button></Center>;
  const order = q.data;
  if (!order) return (
    <Center>
      <h1 className="font-display text-2xl font-bold">Pedido indisponível nesta conta</h1>
      <p className="mt-3 max-w-md text-center text-sm text-muted-foreground">
        Por segurança, cada pedido só aparece para quem fez a compra ou para a administração da loja.
        Se você entrou com a conta do motoboy para testar a entrega, sua sessão anterior foi substituída.
        Entre novamente com a conta utilizada na compra para acompanhar o pedido.
      </p>
      {user.email && <p className="mt-3 text-xs text-muted-foreground">Conta atual: {user.email}</p>}
      <Button className="mt-6" variant="neon" onClick={() => void supabase.auth.signOut()}>
        Trocar de conta
      </Button>
      <Button asChild variant="outline" className="mt-3"><Link to="/conta">Ver meus pedidos</Link></Button>
    </Center>
  );
  if (order.status === "cancelado") return (
    <Center>
      <XCircle className="h-14 w-14 text-destructive" />
      <p className="mt-3 font-display text-2xl font-bold">Pagamento não concluído</p>
      <p className="mt-1 text-sm text-muted-foreground">O pedido #{order.code} foi cancelado. Monte o carrinho de novo para tentar outra vez.</p>
      <Button asChild variant="neon" className="mt-6"><Link to="/loja" search={{}}>Voltar à loja</Link></Button>
    </Center>
  );
  if (order.status !== "pendente" || order.payment_method !== "online") return <OrderSuccess order={order} />;
  if (!initialCheckDone) return <Center><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="mt-4">Verificando pagamento...</p></Center>;
  if (session_id || payment_return) return (
    <Center>
      {!waitingLong && !confirmationError && <Loader2 className="h-10 w-10 animate-spin text-primary" />}
      <p className="mt-4 font-display text-xl font-bold">{waitingLong || confirmationError ? "Pagamento aguardando confirmação" : "Confirmando pagamento..."}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{confirmationError || "Ainda não recebemos a aprovação. Se já pagou, não pague novamente."}</p>
      <Button className="mt-5" disabled={checking} onClick={() => void checkPayment()}>{checking ? "Verificando..." : "Verificar pagamento"}</Button>
      <Button asChild variant="outline" className="mt-3"><Link to="/conta">Meus pedidos</Link></Button>
      {payment_return && <Button asChild variant="outline" className="mt-3"><Link to="/pedido/$id" params={{ id }} search={{}}>Voltar ao pagamento</Link></Button>}
    </Center>
  );
  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 pb-16">
      <h1 className="text-3xl font-black uppercase italic">Pagar pedido <span className="text-gradient-brand">#{order.code}</span></h1>
      <p className="mt-1 mb-6 text-muted-foreground">Total {formatBRL(Number(order.total))} • escolha Pix (QR Code) ou cartão</p>
      {order.delivery_quote_id && <div className="mb-6 space-y-1 border-y py-4 text-sm text-muted-foreground"><p>Produtos {formatBRL(Number(order.subtotal))} + frete {formatBRL(Number(order.shipping_fee))}</p><p>{order.customer_address}</p><p>Entrega estimada: {order.delivery_minutes} minutos</p></div>}
      {confirmationError && <p role="alert" className="mb-4 text-sm text-destructive">{confirmationError}</p>}
      <OnlinePayment orderId={order.id} legacyStripe={order.payment_ref?.startsWith("cs_") ?? false} onComplete={() => { void navigate({ to: "/pedido/$id", params: { id }, search: { session_id: order.payment_ref?.startsWith("cs_") ? order.payment_ref : undefined, payment_return: order.payment_ref?.startsWith("cs_") ? undefined : "1" } }); void checkPayment(); }} />
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center px-4 py-24 text-center">{children}</div>;
}