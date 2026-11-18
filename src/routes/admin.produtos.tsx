import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Pencil, Plus, Trash2, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminCategoriesQuery, adminProductsQuery, type AdminProduct } from "@/lib/admin-queries";
import { removeBackground, trimAndCompress } from "@/lib/bg-removal";
import { formatBRL } from "@/lib/format";
import { PageTitle } from "@/components/admin/ui";
import { ProductStage } from "@/components/site/ProductStage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminHead } from "@/lib/admin-head";

export const Route = createFileRoute("/admin/produtos")({ head: () => adminHead("Produtos", "Cadastro e edição dos produtos da Crazy."), component: Products });

type Draft = {
  id?: string; name: string; category_id: string | null; description: string; price: string; compare_price: string; cost: string;
  stock: string; puffs: string; flavors: string[]; image_url: string | null; accent_color: string; featured: boolean; active: boolean;
};
const empty: Draft = { name: "", category_id: null, description: "", price: "", compare_price: "", cost: "", stock: "0", puffs: "", flavors: [], image_url: null, accent_color: "#c6ff3d", featured: false, active: true };

function Products() {
  const { data: products = [] } = useQuery(adminProductsQuery);
  const { data: cats = [] } = useQuery(adminCategoriesQuery);
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const edit = (p: AdminProduct) => setDraft({
    id: p.id, name: p.name, category_id: p.category_id, description: p.description, price: String(p.price), compare_price: p.compare_price ? String(p.compare_price) : "",
    cost: String(p.cost), stock: String(p.stock), puffs: p.puffs, flavors: p.flavors, image_url: p.image_url, accent_color: p.accent_color, featured: p.featured, active: p.active,
  });
  const del = async (p: AdminProduct) => {
    if (!confirm(`Excluir "${p.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) toast.error(error.message); else { toast.success("Produto excluído"); qc.invalidateQueries(); }
  };

  return (
    <>
      <PageTitle title="Produtos" sub={`${products.length} cadastrados`} action={<Button variant="neon" onClick={() => setDraft({ ...empty })}><Plus /> Novo produto</Button>} />
      {products.length === 0 ? (
        <div className="rounded-3xl border border-dashed p-12 text-center text-muted-foreground">Nenhum produto ainda. Clique em “Novo produto”.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="flex gap-3 rounded-3xl border bg-card p-3">
              <ProductStage src={p.image_url} alt={p.name} accent={p.accent_color} size="sm" className="h-24 w-24 shrink-0 rounded-2xl bg-secondary" />
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">{cats.find((c) => c.id === p.category_id)?.name ?? "Sem marca"}</p>
                <p className="truncate font-semibold">{p.name}</p>
                <p className="text-sm">{formatBRL(Number(p.price))} <span className="text-xs text-muted-foreground">• {p.stock} un.</span></p>
                <div className="mt-auto flex items-center gap-1">
                  {!p.active && <span className="mr-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold">Oculto</span>}
                  {p.featured && <span className="mr-auto rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">Destaque</span>}
                  <Button size="icon" variant="ghost" className="ml-auto" onClick={() => edit(p)} aria-label="Editar"><Pencil /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(p)} aria-label="Excluir"><Trash2 /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {draft && <ProductDialog draft={draft} setDraft={setDraft} cats={cats} />}
    </>
  );
}

function ProductDialog({ draft, setDraft, cats }: { draft: Draft; setDraft: (d: Draft | null) => void; cats: { id: string; name: string }[] }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [autoRemove, setAutoRemove] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [flavorInput, setFlavorInput] = useState("");
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });

  const onFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Envie uma imagem"); return; }
    try {
      setProcessing(autoRemove ? "Removendo fundo..." : "Otimizando...");
      const blob = autoRemove ? await removeBackground(file, (p) => setProcessing(`Removendo fundo... ${p}%`)) : await trimAndCompress(file);
      setProcessing("Enviando...");
      const path = `${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage.from("product-images").upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
      if (error) throw error;
      const { data, error: sErr } = await supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr) throw sErr;
      setDraft({ ...draft, image_url: data.signedUrl });
      toast.success("Imagem pronta!");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível processar a imagem");
    } finally {
      setProcessing(null);
    }
  };

  const addFlavor = () => {
    const parts = flavorInput.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) set("flavors", Array.from(new Set([...draft.flavors, ...parts])).slice(0, 40));
    setFlavorInput("");
  };

  const save = async () => {
    const price = Number(draft.price.replace(",", "."));
    if (!draft.name.trim()) return toast.error("Informe o nome");
    if (!(price >= 0) || draft.price === "") return toast.error("Preço inválido");
    setSaving(true);
    const payload = {
      name: draft.name.trim().slice(0, 140), category_id: draft.category_id, description: draft.description.slice(0, 3000),
      price, compare_price: draft.compare_price ? Number(draft.compare_price.replace(",", ".")) : null,
      cost: Number(draft.cost.replace(",", ".")) || 0, stock: Math.max(0, parseInt(draft.stock) || 0), puffs: draft.puffs.slice(0, 20),
      flavors: draft.flavors, image_url: draft.image_url, accent_color: draft.accent_color, featured: draft.featured, active: draft.active, updated_at: new Date().toISOString(),
    };
    const { error } = draft.id ? await supabase.from("products").update(payload).eq("id", draft.id) : await supabase.from("products").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Produto salvo");
    qc.invalidateQueries();
    setDraft(null);
    return undefined;
  };

  return (
    <Dialog open onOpenChange={(o) => !o && setDraft(null)}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-3xl">
        <DialogHeader><DialogTitle className="font-display">{draft.id ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
        <div className="grid gap-6 md:grid-cols-[260px_1fr]">
          <div className="space-y-3">
            <div className="relative">
              <ProductStage src={draft.image_url} alt="Prévia" accent={draft.accent_color} float className="aspect-square rounded-3xl border bg-background" />
              {processing && <div className="absolute inset-0 grid place-items-center rounded-3xl bg-background/80 text-center text-sm font-semibold"><div><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-primary" />{processing}</div></div>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
            <Button variant="glass" className="w-full" disabled={!!processing} onClick={() => fileRef.current?.click()}><ImagePlus /> {draft.image_url ? "Trocar imagem" : "Enviar imagem"}</Button>
            <label className="flex items-center justify-between rounded-2xl border p-3 text-xs font-semibold">
              <span className="flex items-center gap-2"><Wand2 className="h-4 w-4 text-primary" /> Remover fundo automaticamente</span>
              <Switch checked={autoRemove} onCheckedChange={setAutoRemove} />
            </label>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Cor do brilho</Label>
              <input type="color" value={draft.accent_color} onChange={(e) => set("accent_color", e.target.value)} className="h-8 w-12 cursor-pointer rounded border-0 bg-transparent" />
            </div>
            <p className="text-[11px] text-muted-foreground">A primeira remoção de fundo pode levar alguns segundos enquanto a ferramenta carrega.</p>
          </div>
          <div className="space-y-3">
            <Fld label="Nome"><Input value={draft.name} onChange={(e) => set("name", e.target.value)} /></Fld>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Marca">
                <Select value={draft.category_id ?? "none"} onValueChange={(v) => set("category_id", v === "none" ? null : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Sem marca</SelectItem>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </Fld>
              <Fld label="Puffs"><Input value={draft.puffs} onChange={(e) => set("puffs", e.target.value)} placeholder="Ex: 10.000" /></Fld>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Fld label="Preço (R$)"><Input inputMode="decimal" value={draft.price} onChange={(e) => set("price", e.target.value)} /></Fld>
              <Fld label="De (R$)"><Input inputMode="decimal" value={draft.compare_price} onChange={(e) => set("compare_price", e.target.value)} placeholder="opcional" /></Fld>
              <Fld label="Custo (R$)"><Input inputMode="decimal" value={draft.cost} onChange={(e) => set("cost", e.target.value)} /></Fld>
              <Fld label="Estoque"><Input inputMode="numeric" value={draft.stock} onChange={(e) => set("stock", e.target.value)} /></Fld>
            </div>
            <Fld label="Sabores (separe por vírgula)">
              <div className="flex gap-2">
                <Input value={flavorInput} onChange={(e) => setFlavorInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFlavor(); } }} placeholder="Uva, Menta, Morango Ice" />
                <Button type="button" variant="secondary" onClick={addFlavor}>Adicionar</Button>
              </div>
              {draft.flavors.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">{draft.flavors.map((f) => (
                  <span key={f} className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs">{f}<button onClick={() => set("flavors", draft.flavors.filter((x) => x !== f))} aria-label="Remover"><X className="h-3 w-3" /></button></span>
                ))}</div>
              )}
            </Fld>
            <Fld label="Descrição"><Textarea rows={4} value={draft.description} onChange={(e) => set("description", e.target.value)} /></Fld>
            <div className="flex flex-wrap gap-6 pt-1 text-sm">
              <label className="flex items-center gap-2"><Switch checked={draft.active} onCheckedChange={(v) => set("active", v)} /> Visível na loja</label>
              <label className="flex items-center gap-2"><Switch checked={draft.featured} onCheckedChange={(v) => set("featured", v)} /> Destaque</label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setDraft(null)}>Cancelar</Button>
              <Button variant="neon" disabled={saving || !!processing} onClick={save}>{saving ? "Salvando..." : "Salvar produto"}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}