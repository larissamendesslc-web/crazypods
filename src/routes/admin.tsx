import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart3, Boxes, LayoutDashboard, LogOut, Package, Palette, ReceiptText, Tags, Truck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useThemeSync } from "@/components/site/ThemeDecor";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminLoginEmail } from "@/lib/admin-login";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel — Crazy" },
      { name: "description", content: "Painel administrativo da loja Crazy." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Painel Crazy" },
      { property: "og:description", content: "Administração da loja Crazy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/admin/pedidos", label: "Pedidos", icon: ReceiptText },
  { to: "/admin/delivery", label: "Delivery", icon: Truck },
  { to: "/admin/entregadores", label: "Entregadores", icon: Truck },
  { to: "/admin/produtos", label: "Produtos", icon: Package },
  { to: "/admin/estoque", label: "Estoque", icon: Boxes },
  { to: "/admin/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/admin/pagamentos", label: "Pagamentos", icon: Wallet },
  { to: "/admin/marcas", label: "Marcas", icon: Tags },
  { to: "/admin/aparencia", label: "Aparência", icon: Palette },
] as const;

function AdminLayout() {
  useThemeSync();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const currentSection = NAV.find((item) => item.to === pathname.replace(/\/$/, ""))?.to ?? "/admin";
  const { user, isAdmin, adminLoading } = useAuth();
  if (adminLoading) return <div className="grid min-h-screen place-items-center"><BarChart3 className="h-8 w-8 animate-pulse text-primary" /></div>;
  if (!user) return <AdminLogin />;
  if (!isAdmin) return <NoAccess />;
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="sticky top-0 z-40 min-w-0 border-b bg-card md:h-screen md:border-b-0 md:border-r">
        <div className="flex items-center justify-between p-4 md:p-6">
          <Link to="/"><Logo className="text-2xl" /></Link>
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">Admin</span>
        </div>
        <div className="flex items-center gap-2 px-4 pb-4 md:hidden">
          <Select value={currentSection} onValueChange={(value) => { const section = NAV.find((item) => item.to === value); if (section) navigate({ to: section.to }); }}>
            <SelectTrigger aria-label="Seção do painel" className="h-11 min-w-0 flex-1 rounded-lg bg-background font-semibold"><SelectValue /></SelectTrigger>
            <SelectContent>{NAV.map(({ to, label, icon: Icon }) => <SelectItem key={to} value={to}><span className="flex items-center gap-3"><Icon className="h-4 w-4 text-primary" />{label}</span></SelectItem>)}</SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Sair do painel" title="Sair do painel" onClick={() => supabase.auth.signOut()}><LogOut /></Button>
        </div>
        <nav className="hidden gap-1 px-3 pb-3 md:flex md:flex-col">
          {NAV.map(({ to, label, icon: Icon, ...rest }) => (
            <Link key={to} to={to} activeOptions={{ exact: "exact" in rest }}
              className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-primary/10 text-primary" }}>
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
          <button onClick={() => supabase.auth.signOut()} className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary md:mt-auto">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </nav>
      </aside>
      <main className="min-w-0 p-4 md:p-8"><Outlet /></main>
    </div>
  );
}

function NoAccess() {
  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <Logo className="text-4xl" />
        <p className="mt-6 font-display text-xl font-bold">Acesso restrito</p>
        <p className="mt-2 text-sm text-muted-foreground">Sua conta não tem permissão de administrador.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="glass" onClick={() => supabase.auth.signOut()}>Trocar de conta</Button>
          <Button asChild variant="neon"><Link to="/">Ir para a loja</Link></Button>
        </div>
      </div>
    </div>
  );
}

function AdminLogin() {
  const qc = useQueryClient();
  const exists = useQuery({ queryKey: ["admin-exists"], queryFn: async () => (await supabase.rpc("admin_exists")).data ?? true });
  const setup = exists.data === false;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (setup) {
        if (password.length < 8) throw new Error("Use ao menos 8 caracteres");
        const { error } = await supabase.auth.signUp({ email: adminLoginEmail(email), password, options: { data: { full_name: "Administrador" } } });
        if (error && !error.message.includes("already")) throw error;
        if (error) { const r = await supabase.auth.signInWithPassword({ email: adminLoginEmail(email), password }); if (r.error) throw r.error; }
        const { data, error: cErr } = await supabase.rpc("claim_first_admin");
        if (cErr || !data) throw new Error("Já existe um administrador");
        toast.success("Administrador criado!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: adminLoginEmail(email), password });
        if (error) throw new Error("Usuário ou senha incorretos");
      }
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm animate-rise">
        <div className="text-center"><Logo className="text-5xl" /><p className="mt-2 text-xs font-bold uppercase tracking-[.3em] text-muted-foreground">Painel administrativo</p></div>
        <div className="mt-8 space-y-4 rounded-3xl border bg-card p-6">
          {setup && <p className="rounded-xl bg-primary/10 p-3 text-xs text-primary">Primeiro acesso: crie a conta do administrador principal.</p>}
          <div className="space-y-1.5"><Label htmlFor="admin-login" className="text-xs text-muted-foreground">Usuário ou e-mail</Label><Input id="admin-login" type="text" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl" /></div>
          <div className="space-y-1.5"><Label htmlFor="admin-password" className="text-xs text-muted-foreground">Senha</Label><Input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl" /></div>
          <Button variant="neon" size="xl" className="w-full" disabled={busy}>{busy ? "Aguarde..." : setup ? "Criar administrador" : "Entrar"}</Button>
        </div>
      </form>
    </div>
  );
}