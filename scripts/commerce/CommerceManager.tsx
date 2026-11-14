import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Boxes, Check, ChevronRight, CreditCard, ExternalLink, Image as ImageIcon, Layers3, LockKeyhole, PackagePlus,
  Plus, Save, ShieldCheck, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  emptyCommerceCatalog, formatBRL, parseBRLCents, toSlug, validateCatalog,
  type CommerceCatalog, type Merchandise, type Variant,
} from "@/lib/commerce-model";
import { commerceCatalogQuery, saveCommerceCatalog } from "@/lib/commerce-data";

const field = "mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-violet-400";
const panel = "rounded-2xl border border-border bg-card p-4 sm:p-5";
const emptyStock = () => ({ quitauna: 0, jardimBoaVista: 0 });
const newProduct = (categoryId: string): Merchandise => {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  return {
    id, categoryId, name: "", slug: "", sku: "SKU-" + id.slice(0, 8).toUpperCase(),
    description: "", imageUrl: "", priceCents: 0, compareAtCents: null,
    stock: emptyStock(), variants: [], status: "draft", createdAt: now, updatedAt: now,
  };
};
const clone = (value: CommerceCatalog): CommerceCatalog =>
  JSON.parse(JSON.stringify(value)) as CommerceCatalog;
const moneyInput = (cents: number | null) =>
  cents === null || cents === 0 ? "" : (cents / 100).toFixed(2).replace(".", ",");

export function CommerceManager() {
  const { data, isPending, isError, error: loadingError } = useQuery(commerceCatalogQuery);
  const qc = useQueryClient();
  const hydrated = useRef(false);
  const [catalog, setCatalog] = useState<CommerceCatalog>(emptyCommerceCatalog);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [edit, setEdit] = useState<Merchandise | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [compareInput, setCompareInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<"products" | "categories">("products");
  const [paymentReady, setPaymentReady] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/commerce/pix", { cache: "no-store" })
      .then(r => r.ok ? r.json() : Promise.reject(new Error("Gateway indisponível")))
      .then((result: { enabled?: boolean; orderCreationReady?: boolean }) => {
        if (alive) setPaymentReady(result.enabled === true && result.orderCreationReady === true);
      })
      .catch(() => { if (alive) setPaymentReady(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (data && !hydrated.current) {
      setCatalog(clone(data));
      hydrated.current = true;
    }
  }, [data]);

  const categoryMap = new Map(catalog.categories.map(c => [c.id, c.name]));
  const activeCategories = catalog.categories.filter(c => c.enabled);
  const savedCount = catalog.products.filter(p => p.status === "published").length;

  function modify(updater: (current: CommerceCatalog) => CommerceCatalog) {
    setCatalog(prev => updater(prev));
    setDirty(true);
  }

  function addCategory() {
    const name = newCategoryName.trim();
    const slug = toSlug(name);
    if (name.length < 2 || !slug) {
      toast.error("Informe um nome válido para a categoria."); return;
    }
    if (catalog.categories.some(c => c.slug === slug)) {
      toast.error("Já existe uma categoria com esse nome."); return;
    }
    modify(prev => ({
      ...prev,
      categories: [...prev.categories, {
        id: crypto.randomUUID(), name, slug, description: "", enabled: true,
        order: prev.categories.length,
      }],
    }));
    setNewCategoryName("");
    toast.success("Categoria adicionada ao rascunho.");
  }

  function beginEdit(p: Merchandise) {
    setEdit({ ...p, stock: { ...p.stock }, variants: p.variants.map(v => ({ ...v, stock: { ...v.stock } })) });
    setPriceInput(moneyInput(p.priceCents));
    setCompareInput(moneyInput(p.compareAtCents));
  }

  function beginNew() {
    if (!catalog.categories.length) {
      setTab("categories");
      toast.error("Crie uma categoria para cadastrar produtos."); return;
    }
    const p = newProduct(catalog.categories[0].id);
    beginEdit(p);
  }

  function updateProduct(patch: Partial<Merchandise>) {
    setEdit(prev => prev ? { ...prev, ...patch, updatedAt: new Date().toISOString() } : null);
  }

  function addVariation() {
    if (!edit || edit.variants.length >= 50) return;
    const id = crypto.randomUUID();
    const variant: Variant = {
      id, label: "", sku: edit.sku + "-" + String(edit.variants.length + 1).padStart(2, "0"),
      priceCents: null, stock: emptyStock(),
    };
    updateProduct({ variants: [...edit.variants, variant] });
  }

  function editVariant(id: string, patch: Partial<Variant>) {
    if (!edit) return;
    updateProduct({ variants: edit.variants.map(v => v.id === id ? { ...v, ...patch } : v) });
  }

  function applyProduct() {
    if (!edit) return;
    if (!edit.name.trim() || !edit.categoryId || edit.priceCents <= 0 || !edit.sku.trim()) {
      toast.error("Informe nome, categoria, SKU e preço maior que zero."); return;
    }
    const slug = toSlug(edit.name) + "-" + edit.id.slice(0, 6);
    const updated = { ...edit, slug, updatedAt: new Date().toISOString() };
    const existing = catalog.products.some(p => p.id === edit.id);
    const next = {
      ...catalog,
      products: existing
        ? catalog.products.map(p => p.id === edit.id ? updated : p)
        : [...catalog.products, updated],
    };
    const invalid = validateCatalog(next);
    if (invalid) { toast.error(invalid); return; }
    setCatalog(next);
    setDirty(true);
    setEdit(null);
    toast.success("Produto pronto no rascunho. Clique em Salvar catálogo.");
  }

  async function save() {
    if (edit) {
      toast.error("Aplique ou cancele a edição aberta antes de salvar."); return;
    }
    const invalid = validateCatalog(catalog);
    if (invalid) { toast.error(invalid); return; }
    setSaving(true);
    try {
      await saveCommerceCatalog(catalog);
      await qc.invalidateQueries({ queryKey: commerceCatalogQuery.queryKey });
      setDirty(false);
      toast.success("Catálogo universal salvo e atualizado na vitrine.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (isPending) return <p className="rounded-xl border border-border p-5 text-muted-foreground">Carregando catálogo universal...</p>;
  if (isError) return <p role="alert" className="rounded-xl border border-destructive/30 p-5 text-destructive">
    Não foi possível carregar o catálogo: {loadingError instanceof Error ? loadingError.message : "erro desconhecido"}
  </p>;

  return (
    <div className="space-y-5">
      <header className="relative overflow-hidden rounded-3xl border border-violet-500/30 bg-card px-5 py-6 sm:px-7">
        <div className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-violet-600/15 blur-3xl" />
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-violet-400">Crazy Commerce / Administração</p>
        <h2 className="mt-2 font-display text-2xl font-black tracking-tight sm:text-3xl">Catálogo universal</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Cadastre acessórios, peças, eletrônicos ou outras mercadorias permitidas.
          Categorias e atributos são livres. O preço cadastrado alimenta automaticamente
          o total da vitrine e o carrinho.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-lg">
          {[
            { value: catalog.categories.length, label: "Categorias" },
            { value: catalog.products.length, label: "Produtos" },
            { value: savedCount, label: "Publicados" },
          ].map(v => (
            <div key={v.label} className="rounded-xl border border-border bg-background/60 p-3">
              <div className="text-xl font-black tabular-nums text-violet-400">{v.value}</div>
              <div className="text-[11px] text-muted-foreground">{v.label}</div>
            </div>
          ))}
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-border bg-card p-1">
          <button type="button" onClick={() => setTab("products")} aria-pressed={tab === "products"}
            className={"rounded-lg px-4 py-2 text-xs font-bold " + (tab === "products" ? "bg-violet-600 text-white" : "text-muted-foreground")}>
            <Boxes className="mr-1 inline size-4" /> Produtos
          </button>
          <button type="button" onClick={() => setTab("categories")} aria-pressed={tab === "categories"}
            className={"rounded-lg px-4 py-2 text-xs font-bold " + (tab === "categories" ? "bg-violet-600 text-white" : "text-muted-foreground")}>
            <Layers3 className="mr-1 inline size-4" /> Categorias
          </button>
        </div>
        <a href="/loja" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-violet-400 hover:underline">
          Ver vitrine universal <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      </div>

      {tab === "categories" && (
        <section className={panel + " space-y-4"}>
          <h3 className="text-lg font-black">Organização por categorias</h3>
          <div className="flex flex-wrap gap-2">
            <Input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
              maxLength={90} placeholder="Ex.: Capinhas, fones, películas..."
              className="h-11 min-w-0 flex-1 basis-48" />
            <Button type="button" onClick={addCategory} className="h-11 rounded-xl">
              <Plus className="mr-2 size-4" /> Nova categoria
            </Button>
          </div>
          {catalog.categories.length === 0 && <p className="text-sm text-muted-foreground">
            O catálogo começa vazio, sem produtos antigos importados automaticamente.
          </p>}
          {catalog.categories.map(category => {
            const used = catalog.products.some(p => p.categoryId === category.id);
            return (
              <div key={category.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background/60 p-3">
                <div className="min-w-36 flex-1">
                  <strong className="text-sm">{category.name}</strong>
                  <p className="text-xs text-muted-foreground">/loja · {category.slug}</p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={category.enabled} className="accent-violet-500"
                    onChange={e => modify(prev => ({ ...prev, categories: prev.categories.map(c =>
                      c.id === category.id ? { ...c, enabled: e.target.checked } : c) }))} />
                  Visível
                </label>
                <button type="button" title={used ? "Há produtos nesta categoria" : "Excluir categoria"}
                  disabled={used} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                  onClick={() => modify(prev => ({ ...prev, categories: prev.categories.filter(c => c.id !== category.id) }))}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </section>
      )}

      {tab === "products" && (
        <section className={panel + " space-y-4"}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="text-lg font-black">Produtos cadastrados</h3>
              <p className="text-xs text-muted-foreground">Cadastre preços, variantes e estoque por loja.</p>
            </div>
            <Button type="button" onClick={beginNew} className="h-11 rounded-xl">
              <PackagePlus className="mr-2 size-4" /> Novo produto
            </Button>
          </div>
          {catalog.products.length === 0 && (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
              <Boxes className="mx-auto mb-3 size-8 text-violet-400" />
              <p className="font-semibold">Nenhum produto na nova vitrine.</p>
              <p className="mt-1 text-xs text-muted-foreground">Cadastre a primeira categoria e depois um produto.</p>
            </div>
          )}
          <div className="space-y-2">
            {catalog.products.map(p => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background/50 p-3">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" className="size-14 rounded-lg border border-border object-contain" />
                ) : <div className="grid size-14 place-items-center rounded-lg bg-secondary"><ImageIcon className="size-5 text-muted-foreground" /></div>}
                <div className="min-w-36 flex-1">
                  <div className="text-sm font-bold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {categoryMap.get(p.categoryId) ?? "Sem categoria"} · {p.sku} · {p.status === "published" ? "Publicado" : p.status === "draft" ? "Rascunho" : "Arquivado"}
                  </div>
                </div>
                <strong className="tabular-nums">{formatBRL(p.priceCents)}</strong>
                <Button variant="outline" type="button" onClick={() => beginEdit(p)}>
                  Editar <ChevronRight className="ml-1 size-4" />
                </Button>
                <button type="button" title="Arquivar" aria-label={"Arquivar " + p.name}
                  className="rounded-lg p-2 text-muted-foreground hover:text-foreground"
                  onClick={() => modify(prev => ({ ...prev, products: prev.products.map(x =>
                    x.id === p.id ? { ...x, status: "archived" } : x) }))}>
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {edit && (
        <section aria-label="Editor de produto" className={panel + " space-y-4 border-violet-500/40"}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><h3 className="text-lg font-black">Editor de produto</h3><p className="text-xs text-muted-foreground">
              Alterações só aparecem na loja depois de aplicar e salvar o catálogo.
            </p></div>
            <Button type="button" variant="ghost" onClick={() => setEdit(null)}>Cancelar</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-muted-foreground">Nome do produto
              <Input value={edit.name} onChange={e => updateProduct({ name: e.target.value })}
                className={field} maxLength={160} placeholder="Fone Bluetooth TWS" />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">Categoria
              <select value={edit.categoryId} className={field} onChange={e => updateProduct({ categoryId: e.target.value })}>
                {catalog.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">SKU
              <Input value={edit.sku} onChange={e => updateProduct({ sku: e.target.value })}
                className={field} maxLength={80} />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">Preço de venda (R$)
              <Input value={priceInput} inputMode="decimal" onChange={e => {
                setPriceInput(e.target.value);
                updateProduct({ priceCents: parseBRLCents(e.target.value) ?? 0 });
              }} className={field} placeholder="89,90" />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">De (R$) · opcional
              <Input value={compareInput} inputMode="decimal" onChange={e => {
                setCompareInput(e.target.value);
                updateProduct({ compareAtCents: e.target.value.trim() === "" ? null : parseBRLCents(e.target.value) ?? 0 });
              }} className={field} placeholder="119,90" />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">Status
              <select value={edit.status} className={field} onChange={e =>
                updateProduct({ status: e.target.value as Merchandise["status"] })}>
                <option value="draft">Rascunho</option>
                <option value="published">Publicado na vitrine</option>
                <option value="archived">Arquivado</option>
              </select>
            </label>
            <label className="sm:col-span-2 text-xs font-semibold text-muted-foreground">Foto (URL HTTPS)
              <Input type="url" value={edit.imageUrl} onChange={e => updateProduct({ imageUrl: e.target.value })}
                maxLength={2000} className={field} placeholder="https://.../foto-produto.webp" />
            </label>
            <label className="sm:col-span-2 text-xs font-semibold text-muted-foreground">Descrição
              <textarea rows={4} maxLength={3000} value={edit.description}
                onChange={e => updateProduct({ description: e.target.value })}
                className="mt-1 min-h-28 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-violet-400"
                placeholder="Especificações, material, compatibilidade, garantia..." />
            </label>
          </div>

          {edit.variants.length === 0 && (
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Estoque por unidade</p>
              <div className="grid grid-cols-2 gap-3">
                {(["quitauna", "jardimBoaVista"] as const).map(store => (
                  <label key={store} className="text-xs text-muted-foreground">
                    {store === "quitauna" ? "Quitaúna" : "Jardim Boa Vista"}
                    <Input type="number" min={0} max={1000000} step={1}
                      value={edit.stock[store]} className={field}
                      onChange={e => updateProduct({ stock: { ...edit.stock,
                        [store]: e.target.value === "" ? -1 : Number(e.target.value) } })} />
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 rounded-xl border border-border bg-background/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h4 className="text-sm font-black">Variações do produto</h4>
                <p className="text-xs text-muted-foreground">Ex.: cor, modelo de celular, voltagem ou tamanho.</p>
              </div>
              <Button type="button" variant="outline" disabled={edit.variants.length >= 50} onClick={addVariation}>
                <Plus className="mr-2 size-4" /> Adicionar variação
              </Button>
            </div>
            {edit.variants.map((variant) => (
              <div key={variant.id} className="grid gap-3 rounded-xl border border-border bg-card p-3 sm:grid-cols-2">
                <label className="text-xs text-muted-foreground">Opção (cor/modelo)
                  <Input value={variant.label} className={field} maxLength={100}
                    placeholder="Preto / iPhone 15" onChange={e => editVariant(variant.id, { label: e.target.value })} />
                </label>
                <label className="text-xs text-muted-foreground">SKU desta opção
                  <Input value={variant.sku} className={field} maxLength={80}
                    onChange={e => editVariant(variant.id, { sku: e.target.value })} />
                </label>
                <label className="text-xs text-muted-foreground">Preço específico (R$) · opcional
                  <Input defaultValue={moneyInput(variant.priceCents)} inputMode="decimal" className={field}
                    placeholder="Usar preço principal" onChange={e =>
                      editVariant(variant.id, { priceCents: e.target.value.trim() === "" ? null : parseBRLCents(e.target.value) ?? 0 })} />
                </label>
                {(["quitauna", "jardimBoaVista"] as const).map(store => (
                  <label key={store} className="text-xs text-muted-foreground">
                    Estoque {store === "quitauna" ? "Quitaúna" : "Jardim Boa Vista"}
                    <Input type="number" min={0} max={1000000} value={variant.stock[store]} className={field}
                      onChange={e => editVariant(variant.id, { stock: { ...variant.stock,
                        [store]: e.target.value === "" ? -1 : Number(e.target.value) } })} />
                  </label>
                ))}
                <Button type="button" variant="ghost" className="sm:col-span-2 text-destructive"
                  onClick={() => updateProduct({ variants: edit.variants.filter(v => v.id !== variant.id) })}>
                  <Trash2 className="mr-2 size-4" /> Excluir variação
                </Button>
              </div>
            ))}
          </div>

          <Button type="button" onClick={applyProduct} className="h-11 w-full rounded-xl bg-violet-600 font-bold text-white hover:bg-violet-500">
            <Check className="mr-2 size-4" /> Aplicar produto ao catálogo
          </Button>
        </section>
      )}

      <section className={panel + " space-y-4"}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-violet-400">Infraestrutura financeira</p>
            <h3 className="font-display text-lg font-black">Pagamentos e checkout</h3>
            <p className="mt-1 text-xs text-muted-foreground">Status das integrações do futuro comércio oficial.</p>
          </div>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[10px] font-bold uppercase text-amber-400">
            Ativação controlada
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-background/60 p-4">
            <CreditCard className="mb-2 size-5 text-violet-400" aria-hidden="true" />
            <p className="font-bold">Pix · Mercado Pago</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {paymentReady === null ? "Verificando o backend..." :
                paymentReady ? "Integração técnica habilitada — sujeita à revisão de pedidos." :
                "Integração preparada. Aguardando banco e credenciais oficiais."}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 p-4">
            <LockKeyhole className="mb-2 size-5 text-violet-400" aria-hidden="true" />
            <p className="font-bold">Cartões e pedidos</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Checkout real, reserva de estoque e cartões ainda exigem validação completa.
              Nenhuma cobrança é feita neste painel.
            </p>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          As credenciais são configuradas somente nas variáveis privadas da Vercel,
          nunca em campos públicos do site. O valor da compra será calculado pelo servidor,
          com produtos e estoque conferidos antes de qualquer pagamento real.
        </p>
      </section>
      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-500/30 bg-card/95 p-3 shadow-xl backdrop-blur">
        <div className="text-xs text-muted-foreground">
          {dirty ? "Alterações não salvas" : "Catálogo sincronizado"}
          <p>Sem cobranças ou pedidos ativos nesta etapa.</p>
        </div>
        <Button type="button" onClick={() => void save()} disabled={saving || !!edit || !dirty}
          className="h-11 rounded-xl bg-violet-600 px-5 text-white hover:bg-violet-500">
          <Save className="mr-2 size-4" /> {saving ? "Salvando..." : "Salvar catálogo"}
        </Button>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/40 p-4 text-xs text-muted-foreground">
        <ShieldCheck className="size-5 shrink-0 text-violet-400" />
        <p>Os produtos antigos não são importados automaticamente.
          Este módulo cadastra mercadorias novas e seus preços para a vitrine universal.
          O checkout Pix real depende da configuração da empresa, banco e segurança do pedido.</p>
      </div>
    </div>
  );
}
