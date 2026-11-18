import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cashQuery } from "@/lib/admin-queries";
import { formatBRL } from "@/lib/format";
import { PageTitle, Stat } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminHead } from "@/lib/admin-head";

export const Route = createFileRoute("/admin/financeiro")({ head: () => adminHead("Financeiro", "Entradas, saídas e saldo da loja Crazy."), component: Finance });

function Finance() {
  const { data: entries = [] } = useQuery(cashQuery);
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [kind, setKind] = useState<"entrada" | "saida">("saida");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");

  const list = useMemo(() => entries.filter((e) => e.occurred_at.slice(0, 7) === month), [entries, month]);
  const inT = list.filter((e) => e.kind === "entrada").reduce((s, e) => s + Number(e.amount), 0);
  const outT = list.filter((e) => e.kind === "saida").reduce((s, e) => s + Number(e.amount), 0);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = Number(amount.replace(",", "."));
    if (!(v > 0)) return toast.error("Valor inválido");
    const { error } = await supabase.from("cash_entries").insert({ kind, amount: v, description: desc.trim().slice(0, 200) || (kind === "entrada" ? "Entrada" : "Saída") });
    if (error) return toast.error(error.message);
    setAmount(""); setDesc("");
    qc.invalidateQueries({ queryKey: ["admin", "cash"] });
    toast.success("Lançamento registrado");
    return undefined;
  };
  const remove = async (id: string) => {
    if (!confirm("Excluir lançamento?")) return;
    await supabase.from("cash_entries").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin", "cash"] });
  };

  return (
    <>
      <PageTitle title="Financeiro" sub="Dinheiro que entra e sai" action={<Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44 rounded-xl" />} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Entradas" value={formatBRL(inT)} tone="primary" />
        <Stat label="Saídas" value={formatBRL(outT)} tone="danger" />
        <Stat label="Saldo" value={formatBRL(inT - outT)} tone={inT - outT >= 0 ? "primary" : "danger"} />
      </div>
      <form onSubmit={add} className="mt-6 flex flex-wrap items-end gap-2 rounded-3xl border bg-card p-4">
        <div className="flex rounded-full border p-1 text-xs font-bold">
          {(["entrada", "saida"] as const).map((k) => (
            <button type="button" key={k} onClick={() => setKind(k)} className={`rounded-full px-4 py-2 ${kind === k ? (k === "entrada" ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground") : "text-muted-foreground"}`}>{k === "entrada" ? "Entrada" : "Saída"}</button>
          ))}
        </div>
        <Input placeholder="Valor" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32 rounded-xl" />
        <Input placeholder="Descrição (ex: compra de estoque, frete)" value={desc} onChange={(e) => setDesc(e.target.value)} className="min-w-48 flex-1 rounded-xl" />
        <Button variant="neon">Lançar</Button>
      </form>
      <div className="mt-4 overflow-hidden rounded-3xl border bg-card">
        {list.map((e) => (
          <div key={e.id} className="flex flex-wrap items-center gap-3 border-b p-4 last:border-0">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${e.kind === "entrada" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
              {e.kind === "entrada" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{e.description}</p><p className="text-xs text-muted-foreground">{new Date(e.occurred_at).toLocaleString("pt-BR")}</p></div>
            <span className={`max-w-full break-words font-bold tabular-nums ${e.kind === "entrada" ? "text-primary" : "text-destructive"}`}>{e.kind === "entrada" ? "+" : "−"}{formatBRL(Number(e.amount))}</span>
            {!e.order_id && <Button size="icon" variant="ghost" onClick={() => remove(e.id)} aria-label="Excluir"><Trash2 /></Button>}
          </div>
        ))}
        {list.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Sem lançamentos neste mês.</p>}
      </div>
    </>
  );
}