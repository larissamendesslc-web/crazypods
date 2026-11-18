import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Banknote, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { formatBRL } from "@/lib/format";
import type { Order, Profile } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AuthForm } from "@/components/site/AuthForm";
import { ProductStage } from "@/components/site/ProductStage";
import { OrderSuccess } from "@/components/site/OrderSuccess";
import { DeliveryAddress } from "@/components/site/DeliveryAddress";
import { deliveredTotal, type DeliveryQuote } from "@/lib/delivery";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Finalizar compra — Crazy" },
      { name: "description", content: "Revise seu carrinho, confirme a entrega e finalize seu pedido na Crazy." },
      { property: "og:title", content: "Finalizar compra — Crazy" },
      { property: "og:description", content: "Finalize seu pedido em poucos toques." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Checkout,
});

const deliverySchema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome").max(120),
  phone: z.string().trim().min(10, "Telefone com DDD").max(20),
});

const METHODS = [
  { id: "online", label: "Pix ou cartão", hint: "Pague agora, aprovação na hora", icon: QrCode },
  { id: "dinheiro", label: "Dinheiro na entrega", hint: "Informe se precisa de troco", icon: Banknote },
] as const;

function Checkout() {
  const { user, ready } = useAuth();
  const cart = useCart();
  const qc = useQueryClient();
  const [done, setDone] = useState<Order | null>(null);
  const navigate = useNavigate();
  const [method, setMethod] = useState<string>("online");
  const [needChange, setNeedChange] = useState(false);
  const [changeFor, setChangeFor] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "" });
  const [delivery, setDelivery] = useState<DeliveryQuote | null>(null);
  const total = deliveredTotal(cart.subtotal, delivery?.shippingFee ?? 0);

  const profile = useQuery({
    queryKey: ["me", "profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
  useEffect(() => {
    if (profile.data) {
      const { full_name, phone } = profile.data;
      setForm({ full_name, phone });
    }
  }, [profile.data]);

  if (done) return <OrderSuccess order={done} />;

  if (cart.items.length === 0) return (
    <div className="py-24 text-center">
      <p className="font-display text-2xl font-bold">Seu carrinho está vazio</p>
      <Button asChild variant="neon" className="mt-6"><Link to="/loja" search={{}}>Ir para a loja</Link></Button>
    </div>
  );

  const submit = async () => {
    if (!user) return;
    if (!delivery || Date.parse(delivery.expiresAt) <= Date.now()) { setDelivery(null); toast.error("Calcule o frete antes de confirmar"); return; }
    const parsed = deliverySchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos"); return; }
    const change = needChange ? Number(changeFor.replace(",", ".")) : null;
    if (method === "dinheiro" && needChange && (!change || change < total)) {
      toast.error("Informe uma nota maior ou igual ao total"); return;
    }
    setBusy(true);
    try {
      const { error: pErr } = await supabase.from("profiles").update({ full_name: parsed.data.full_name, phone: parsed.data.phone, address: delivery.address.slice(0, 300) }).eq("id", user.id);
      if (pErr) throw pErr;
      const { data, error } = await supabase.rpc("place_order", {
        _items: cart.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity, flavor: i.flavor })),
        _payment_method: method,
        _notes: notes.slice(0, 500),
        _change_for: method === "dinheiro" ? (change ?? 0) : 0,
        _delivery_quote_id: delivery.id,
      });
      if (error) throw error;
      cart.clear();
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      const order = data as unknown as Order;
      if (order.payment_method === "online") { navigate({ to: "/pedido/$id", params: { id: order.id } }); return; }
      setDone(order);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível finalizar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <h1 className="text-3xl font-black uppercase italic sm:text-5xl">Finalizar <span className="text-gradient-brand">compra</span></h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {!ready ? null : !user ? (
            <section className="rounded-3xl border bg-card p-5 sm:p-7">
              <h2 className="mb-1 font-display text-lg font-bold">1. Identifique-se</h2>
              <p className="mb-5 text-sm text-muted-foreground">Entre ou crie sua conta para finalizar a compra.</p>
              <AuthForm initialMode="signup" />
            </section>
          ) : (
            <>
              <section className="rounded-3xl border bg-card p-5 sm:p-7">
                <h2 className="mb-5 font-display text-lg font-bold">1. Entrega</h2>
                <DeliveryAddress onQuote={setDelivery} />
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <F label="Nome"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="h-12 rounded-xl" /></F>
                  <F label="Telefone / WhatsApp"><Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-12 rounded-xl" /></F>
                </div>
              </section>
              <section className="rounded-3xl border bg-card p-5 sm:p-7">
                <h2 className="mb-5 font-display text-lg font-bold">2. Pagamento</h2>
                <div className="grid grid-cols-2 gap-2">
                  {METHODS.map(({ id, label, hint, icon: Icon }) => (
                    <button key={id} onClick={() => setMethod(id)} className={`flex flex-col items-center gap-1.5 rounded-2xl border p-4 text-center text-xs font-bold transition-all ${method === id ? "border-primary bg-primary/10 shadow-glow" : "text-muted-foreground"}`}>
                      <Icon className={`h-6 w-6 ${method === id ? "text-primary" : ""}`} /> {label}
                      <span className="text-[10px] font-medium text-muted-foreground">{hint}</span>
                    </button>
                  ))}
                </div>
                {method === "dinheiro" && (
                  <div className="mt-4 space-y-3 rounded-2xl border bg-secondary/40 p-4">
                    <div className="flex gap-2">
                      <button onClick={() => setNeedChange(false)} className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold ${!needChange ? "border-primary bg-primary/10" : "text-muted-foreground"}`}>Não preciso de troco</button>
                      <button onClick={() => setNeedChange(true)} className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold ${needChange ? "border-primary bg-primary/10" : "text-muted-foreground"}`}>Preciso de troco</button>
                    </div>
                    {needChange && (
                      <F label="Vou pagar com uma nota de (R$)">
                        <Input inputMode="decimal" placeholder="Ex.: 100" value={changeFor} onChange={(e) => setChangeFor(e.target.value.replace(/[^0-9,.]/g, ""))} className="h-12 rounded-xl" />
                      </F>
                    )}
                    {delivery && needChange && Number(changeFor.replace(",", ".")) >= total && (
                      <p className="text-xs text-muted-foreground">Troco: <b className="text-foreground">{formatBRL(Number(changeFor.replace(",", ".")) - total)}</b></p>
                    )}
                  </div>
                )}
                <div className="mt-4"><F label="Observações (opcional)"><Textarea value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} placeholder="Ponto de referência, complemento..." className="rounded-xl" /></F></div>
              </section>
            </>
          )}
        </div>

        <aside className="h-fit rounded-3xl border bg-card p-5 lg:sticky lg:top-32">
          <h2 className="mb-4 font-display text-lg font-bold">Resumo</h2>
          <ul className="space-y-3">
            {cart.items.map((i) => (
              <li key={i.key} className="flex items-center gap-3">
                <ProductStage src={i.image_url} alt={i.name} accent={i.accent_color} size="sm" className="h-14 w-14 shrink-0 rounded-xl bg-secondary" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{i.quantity}x {i.name}</p>{i.flavor && <p className="text-xs text-muted-foreground">{i.flavor}</p>}</div>
                <span className="text-sm font-bold">{formatBRL(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 space-y-2 border-t pt-4 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Produtos</span><span>{formatBRL(cart.subtotal)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span>{delivery ? formatBRL(delivery.shippingFee) : "A calcular"}</span></div>{delivery && <p className="text-xs text-muted-foreground">Entrega estimada: {delivery.minutes} minutos</p>}</div>
          <div className="mt-4 flex items-end justify-between border-t pt-4">
            <span className="text-muted-foreground">Total</span>
            <span className="font-display text-3xl font-black">{delivery ? formatBRL(total) : "—"}</span>
          </div>
          <Button variant="neon" size="xl" className="mt-5 w-full" disabled={!user || busy || !delivery} onClick={submit}>
            {busy ? "Confirmando..." : method === "online" ? "Ir para o pagamento" : "Confirmar pedido"}
          </Button>
          {!user && <p className="mt-2 text-center text-xs text-muted-foreground">Entre na sua conta para confirmar</p>}
          {user && !delivery && <p role="status" className="mt-2 text-center text-xs text-muted-foreground">Pagamento disponível após a confirmação do frete.</p>}
        </aside>
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-xs font-semibold text-muted-foreground">{label}</span>{children}</label>;
}