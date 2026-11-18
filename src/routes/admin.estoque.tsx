import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminProductsQuery } from "@/lib/admin-queries";
import { formatBRL } from "@/lib/format";
import { PageTitle, Stat } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { adminHead } from "@/lib/admin-head";

export const Route = createFileRoute("/admin/estoque")({ head: () => adminHead("Estoque", "Controle das quantidades de produtos da Crazy."), component: Stock });

function Stock() {
  const { data: products = [] } = useQuery(adminProductsQuery);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const list = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.stock - b.stock);
  const units = products.reduce((s, p) => s + p.stock, 0);
  const value = products.reduce((s, p) => s + p.stock * Number(p.cost), 0);

  const setStock = async (id: string, stock: number) => {
    const { error } = await supabase.from("products").update({ stock: Math.max(0, stock), updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["admin", "products"] });
  };

  return (
    <>
      <PageTitle title="Estoque" sub="Ajuste rápido das quantidades" />
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Unidades" value={String(units)} />
        <Stat label="Valor em custo" value={formatBRL(value)} tone="primary" />
        <Stat label="Esgotados" value={String(products.filter((p) => p.stock === 0).length)} tone="danger" />
      </div>
      <Input placeholder="Buscar produto..." value={q} onChange={(e) => setQ(e.target.value)} className="mb-4 h-11 max-w-sm rounded-xl" />
      <div className="overflow-hidden rounded-3xl border bg-card">
        {list.map((p) => (
          <div key={p.id} className="flex flex-col items-start gap-3 border-b p-3 last:border-0 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1"><p className="break-words font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">Custo {formatBRL(Number(p.cost))} • Venda {formatBRL(Number(p.price))}</p></div>
            <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
              <Button size="icon" variant="ghost" onClick={() => setStock(p.id, p.stock - 1)} aria-label="Menos"><Minus /></Button>
              <Input key={p.stock} defaultValue={p.stock} inputMode="numeric" onBlur={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v !== p.stock) setStock(p.id, v); }}
                className={`h-9 w-16 text-center font-bold ${p.stock === 0 ? "text-destructive" : p.stock <= 5 ? "text-accent" : ""}`} />
              <Button size="icon" variant="ghost" onClick={() => setStock(p.id, p.stock + 1)} aria-label="Mais"><Plus /></Button>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Nenhum produto.</p>}
      </div>
    </>
  );
}