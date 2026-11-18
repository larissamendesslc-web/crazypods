import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { trimAndCompress } from "@/lib/bg-removal";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminCategoriesQuery } from "@/lib/admin-queries";
import { PageTitle } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { adminHead } from "@/lib/admin-head";

export const Route = createFileRoute("/admin/marcas")({ head: () => adminHead("Marcas", "Gerencie as marcas e categorias da Crazy."), component: Brands });

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function Brands() {
  const { data: cats = [] } = useQuery(adminCategoriesQuery);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin", "categories"] }); qc.invalidateQueries({ queryKey: ["categories"] }); };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const { error } = await supabase.from("categories").insert({ name: name.trim().slice(0, 60), slug: slugify(name), tagline: tagline.slice(0, 120), sort_order: cats.length + 1 });
    if (error) return toast.error(error.message.includes("duplicate") ? "Marca já existe" : error.message);
    setName(""); setTagline(""); refresh();
    return undefined;
  };
  const update = async (id: string, patch: { active?: boolean; tagline?: string; name?: string; logo_url?: string | null }) => {
    const { error } = await supabase.from("categories").update(patch).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };
  const [uploading, setUploading] = useState<string | null>(null);
  const uploadLogo = async (id: string, file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Envie uma imagem"); return; }
    setUploading(id);
    try {
      const blob = file.type === "image/svg+xml" ? file : await trimAndCompress(file, 600);
      const ext = file.type === "image/svg+xml" ? "svg" : "webp";
      const path = `brands/${id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, blob, { contentType: blob.type || "image/webp" });
      if (error) throw error;
      const { data, error: sErr } = await supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr) throw sErr;
      await update(id, { logo_url: data.signedUrl });
      toast.success("Logo atualizado");
    } catch { toast.error("Não foi possível enviar o logo"); }
    finally { setUploading(null); }
  };
  const remove = async (id: string) => {
    if (!confirm("Excluir marca? Os produtos ficam sem marca.")) return;
    await supabase.from("categories").delete().eq("id", id); refresh();
  };

  return (
    <>
      <PageTitle title="Marcas" sub="Clique no quadrado para enviar o logo oficial (PNG transparente ou SVG fica melhor)" />
      <form onSubmit={add} className="mb-4 flex flex-wrap gap-2 rounded-3xl border bg-card p-4">
        <Input placeholder="Nome da marca" value={name} onChange={(e) => setName(e.target.value)} className="w-48 rounded-xl" />
        <Input placeholder="Frase curta" value={tagline} onChange={(e) => setTagline(e.target.value)} className="min-w-48 flex-1 rounded-xl" />
        <Button variant="neon">Adicionar</Button>
      </form>
      <div className="overflow-hidden rounded-3xl border bg-card">
        {cats.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-3 border-b p-3 last:border-0">
            <label className="relative grid h-14 w-14 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl border bg-secondary" title="Enviar logo">
              {uploading === c.id ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : c.logo_url ? <img src={c.logo_url} alt={c.name} className="h-full w-full object-contain p-1.5" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
              <input type="file" accept="image/png,image/webp,image/svg+xml,image/jpeg" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(c.id, f); e.target.value = ""; }} />
            </label>
            <Input defaultValue={c.name} onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && update(c.id, { name: e.target.value.trim().slice(0, 60) })} className="w-44 font-display font-bold" />
            <Input defaultValue={c.tagline} onBlur={(e) => e.target.value !== c.tagline && update(c.id, { tagline: e.target.value.slice(0, 120) })} className="min-w-40 flex-1" />
            <label className="flex items-center gap-2 text-xs"><Switch checked={c.active} onCheckedChange={(v) => update(c.id, { active: v })} /> Visível</label>
            <Button size="icon" variant="ghost" onClick={() => remove(c.id)} aria-label="Excluir"><Trash2 /></Button>
          </div>
        ))}
      </div>
    </>
  );
}