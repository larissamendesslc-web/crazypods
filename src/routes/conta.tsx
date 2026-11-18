import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatBRL } from "@/lib/format";
import type { Order, Profile } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthForm } from "@/components/site/AuthForm";
import { STATUS_STYLES } from "@/components/site/status";

export const Route = createFileRoute("/conta")({
  head: () => ({
    meta: [
      { title: "Minha conta — Crazy" },
      { name: "description", content: "Entre ou crie sua conta Crazy para comprar e acompanhar pedidos." },
      { property: "og:title", content: "Minha conta — Crazy" },
      { property: "og:description", content: "Seus dados e pedidos na Crazy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Account,
});

function Account() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return (
    <div className="mx-auto max-w-md px-4 pt-10">
      <h1 className="text-center text-3xl font-black uppercase italic">Sua <span className="text-gradient-brand">conta</span></h1>
      <p className="mb-8 mt-2 text-center text-sm text-muted-foreground">Cadastro rápido, sem código de confirmação.</p>
      <div className="rounded-3xl border bg-card p-6"><AuthForm /></div>
    </div>
  );
  return <Dashboard userId={user.id} email={user.email ?? ""} />;
}

function Dashboard({ userId, email }: { userId: string; email: string }) {
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["me", "profile", userId], queryFn: async () => (await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()).data as Profile | null });
  const orders = useQuery({ queryKey: ["me", "orders", userId], queryFn: async () => { const { data, error } = await supabase.from("orders").select("*").eq("user_id", userId).order("created_at", { ascending: false }); if (error) throw error; return data as Order[]; }, refetchInterval: 10000 });
  const [f, setF] = useState({ full_name: "", phone: "", address: "", city: "", zip: "" });
  useEffect(() => { if (profile.data) { const { full_name, phone, address, city, zip } = profile.data; setF({ full_name, phone, address, city, zip }); } }, [profile.data]);

  const save = async () => {
    const { error } = await supabase.from("profiles").update({
      full_name: f.full_name.slice(0, 120), phone: f.phone.slice(0, 20), address: f.address.slice(0, 300), city: f.city.slice(0, 100), zip: f.zip.slice(0, 20),
    }).eq("id", userId);
    if (error) toast.error("Erro ao salvar"); else { toast.success("Dados salvos"); qc.invalidateQueries({ queryKey: ["me", "profile"] }); }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Olá, <span className="text-gradient-brand">{profile.data?.full_name?.split(" ")[0] || "você"}</span></h1>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
        <Button variant="glass" onClick={() => supabase.auth.signOut()}><LogOut /> Sair</Button>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1.3fr]">
        <section className="h-fit rounded-3xl border bg-card p-6">
          <h2 className="mb-4 font-display font-bold">Meus dados</h2>
          <div className="space-y-3">
            {([["full_name", "Nome"], ["phone", "Telefone"], ["address", "Endereço"], ["city", "Cidade"], ["zip", "CEP"]] as const).map(([k, l]) => (
              <div key={k} className="space-y-1.5"><Label className="text-xs text-muted-foreground">{l}</Label><Input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="h-11 rounded-xl" /></div>
            ))}
            <Button variant="neon" className="w-full" onClick={save}>Salvar</Button>
          </div>
        </section>
        <section>
          <h2 className="mb-4 font-display font-bold">Meus pedidos</h2>
          {orders.data?.length ? (
            <ul className="space-y-3">
              {orders.data.map((o) => (
                <li key={o.id} className="rounded-3xl border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold">#{o.code}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${STATUS_STYLES[o.status] ?? ""}`}>{o.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")}</p>
                  <ul className="mt-3 space-y-1 text-sm">
                    {(o.items as unknown as { name: string; flavor: string; quantity: number }[]).map((i, idx) => (
                      <li key={idx} className="text-muted-foreground">{i.quantity}x {i.name}{i.flavor ? ` • ${i.flavor}` : ""}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-right font-display font-bold">{formatBRL(Number(o.total))}</p>
                  <Button asChild variant="outline" size="sm" className="mt-3"><Link to="/pedido/$id" params={{ id: o.id }} search={{ session_id: undefined }}>Acompanhar pedido</Link></Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">
              Nenhum pedido ainda. <Link to="/loja" search={{}} className="font-bold text-primary">Explore a loja</Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}