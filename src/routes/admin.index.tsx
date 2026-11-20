import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminOrdersQuery, adminProductsQuery, cashQuery } from "@/lib/admin-queries";
import { formatBRL } from "@/lib/format";
import { PageTitle, Stat } from "@/components/admin/ui";
import { STATUS_STYLES } from "@/components/site/status";
import { adminHead } from "@/lib/admin-head";

export const Route = createFileRoute("/admin/")({ head: () => adminHead("Visão geral", "Resumo de vendas, pedidos e estoque da Crazy."), component: Overview });

function Overview() {
  const { data: orders = [] } = useQuery(adminOrdersQuery);
  const { data: products = [] } = useQuery(adminProductsQuery);
  const { data: cash = [] } = useQuery(cashQuery);
  const now = new Date();
  const today = orders.filter((o) => new Date(o.created_at).toDateString() === now.toDateString() && o.status !== "cancelado");
  const month = cash.filter((c) => { const d = new Date(c.occurred_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const inM = month.filter((c) => c.kind === "entrada").reduce((s, c) => s + Number(c.amount), 0);
  const outM = month.filter((c) => c.kind === "saida").reduce((s, c) => s + Number(c.amount), 0);
  const low = products.filter((p) => p.active && p.stock <= 5).sort((a, b) => a.stock - b.stock);
  const pending = orders.filter((o) => o.status === "pendente");

  return (
    <>
      <PageTitle title="Visão geral" sub={now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })} />
      <Link to="/admin/convites" className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm font-semibold transition-colors hover:bg-primary/10">Crie convites digitais para Instagram e WhatsApp <span className="text-primary">Abrir divulgação ↗</span></Link>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Vendas hoje" value={formatBRL(today.reduce((s, o) => s + Number(o.total), 0))} tone="primary" />
        <Stat label="Pedidos pendentes" value={String(pending.length)} tone="accent" />
        <Stat label="Saldo do mês" value={formatBRL(inM - outM)} tone={inM - outM >= 0 ? "primary" : "danger"} />
        <Stat label="Estoque baixo" value={String(low.length)} tone={low.length ? "danger" : "default"} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border bg-card p-5">
          <div className="mb-4 flex justify-between"><h2 className="font-display font-bold">Pedidos pendentes</h2><Link to="/admin/pedidos" className="text-sm text-primary">Ver todos</Link></div>
          {pending.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum pedido pendente.</p> : (
            <ul className="divide-y">{pending.slice(0, 6).map((o) => (
              <li key={o.id} className="flex items-center justify-between py-3 text-sm">
                <div><span className="font-bold">#{o.code}</span> <span className="text-muted-foreground">• {o.customer_name}</span></div>
                <div className="flex items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLES[o.status]}`}>{o.status}</span><span className="font-bold">{formatBRL(Number(o.total))}</span></div>
              </li>
            ))}</ul>
          )}
        </section>
        <section className="rounded-3xl border bg-card p-5">
          <div className="mb-4 flex justify-between"><h2 className="font-display font-bold">Estoque baixo</h2><Link to="/admin/estoque" className="text-sm text-primary">Gerenciar</Link></div>
          {low.length === 0 ? <p className="text-sm text-muted-foreground">Tudo abastecido.</p> : (
            <ul className="divide-y">{low.slice(0, 6).map((p) => (
              <li key={p.id} className="flex justify-between py-3 text-sm"><span>{p.name}</span><span className={`font-bold ${p.stock === 0 ? "text-destructive" : "text-accent"}`}>{p.stock} un.</span></li>
            ))}</ul>
          )}
        </section>
      </div>
    </>
  );
}