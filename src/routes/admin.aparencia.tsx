import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery } from "@/lib/queries";
import { THEMES } from "@/components/site/ThemeDecor";
import { PageTitle } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminHead } from "@/lib/admin-head";
import { HomeVisualEditor } from "@/components/admin/HomeVisualEditor";

export const Route = createFileRoute("/admin/aparencia")({ head: () => adminHead("Aparência", "Temas sazonais e informações da loja Crazy."), component: Appearance });

function Appearance() {
  const { data: s } = useQuery(settingsQuery);
  const qc = useQueryClient();
  const [f, setF] = useState({ announcement: "", whatsapp: "", pix_key: "" });
  useEffect(() => { if (s) setF({ announcement: s.announcement, whatsapp: s.whatsapp, pix_key: s.pix_key }); }, [s]);

  const save = async (patch: Partial<{ theme: string; announcement: string; whatsapp: string; pix_key: string }>) => {
    const { error } = await supabase.from("site_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Salvo! A loja já foi atualizada.");
    qc.invalidateQueries({ queryKey: ["settings"] });
    return undefined;
  };

  return (
    <>
      <PageTitle title="Aparência" sub="Tema sazonal e informações da loja" />
      <h2 className="mb-3 font-display font-bold">Tema da loja</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {THEMES.map((t) => {
          const active = (s?.theme ?? "padrao") === t.id;
          return (
            <button key={t.id} onClick={() => save({ theme: t.id })} className={`relative overflow-hidden rounded-3xl border p-4 text-left transition-all ${active ? "border-primary shadow-glow" : "hover:border-foreground/30"}`}>
              <div className="flex h-20 overflow-hidden rounded-2xl">{t.colors.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}</div>
              <p className="mt-3 font-display font-bold">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
              {active && <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-4 w-4" /></span>}
            </button>
          );
        })}
      </div>
      <div className="mt-8 max-w-xl space-y-4 rounded-3xl border bg-card p-6">
        <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Faixa de anúncio (topo do site)</Label><Input value={f.announcement} maxLength={140} onChange={(e) => setF({ ...f, announcement: e.target.value })} /></div>
        <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">WhatsApp da loja (com DDD)</Label><Input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value.replace(/[^\d]/g, "").slice(0, 15) })} /></div>
        <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Chave Pix (aparece após o pedido)</Label><Input value={f.pix_key} maxLength={140} onChange={(e) => setF({ ...f, pix_key: e.target.value })} /></div>
        <Button variant="neon" onClick={() => save(f)}>Salvar informações</Button>
      </div>
      <HomeVisualEditor />
    </>
  );
}