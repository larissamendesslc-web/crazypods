import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronLeft, CreditCard, MapPin, Minus, Plus, Search, ShoppingBag, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { commerceCatalogQuery } from "@/lib/commerce-data";
import {
  formatBRL, resolveCart, storefrontProducts,
  type Merchandise, type ShopCartLine, type CommerceCatalog,
} from "@/lib/commerce-model";
import { settingsQuery } from "@/lib/settings";
import { digits, formatCep, lookupCep, storeNames, type StoreId } from "@/lib/delivery";
import { calculateDeliveryQuote, calculateZoneQuote } from "@/lib/delivery-pricing";
import { calculateDemoRoadRoutes } from "@/lib/demo-road-routes";

const units: StoreId[] = ["quitauna", "jardimBoaVista"];
const storageKey = "crazy-commerce-cart-v1";
const buttonNeutral = "rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-semibold transition hover:border-violet-500/50";

function ProductTile({ p, category, store, add }: {
  p: Merchandise;
  category: string;
  store: StoreId;
  add: (productId: string, variantId: string | null) => void;
}) {
  const [variantId, setVariantId] = useState("");
  const variant = p.variants.find(v => v.id === variantId) ?? p.variants[0];
  const effectivePrice = variant?.priceCents ?? p.priceCents;
  const available = variant ? variant.stock[store] : p.stock[store];
  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-violet-500/40">
      <div className="relative grid aspect-[5/4] place-items-center overflow-hidden bg-secondary/40 p-4">
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} loading="lazy" className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105" />
        ) : <ShoppingBag className="size-14 text-violet-400/50" aria-hidden="true" />}
        <span className="absolute left-3 top-3 rounded-full border border-border bg-card/95 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">{category}</span>
        {available === 0 && <span className="absolute right-3 top-3 rounded-full bg-background px-3 py-1 text-[10px] font-bold">Sem estoque</span>}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-2 text-base font-black leading-snug">{p.name}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description || "Confira as opções disponíveis."}</p>
        </div>
        {p.variants.length > 0 && (
          <label className="text-xs font-semibold text-muted-foreground">Escolha sua opção
            <select value={variant?.id ?? ""} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm"
              onChange={e => setVariantId(e.target.value)}>
              {p.variants.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </label>
        )}
        <div className="mt-auto space-y-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-display text-xl font-black tabular-nums">{formatBRL(effectivePrice)}</span>
            {p.compareAtCents !== null && p.compareAtCents > effectivePrice && (
              <span className="text-xs text-muted-foreground line-through">{formatBRL(p.compareAtCents)}</span>
            )}
          </div>
          <Button type="button" disabled={available < 1} onClick={() => add(p.id, variant?.id ?? null)}
            className="h-11 w-full rounded-xl bg-violet-600 font-bold text-white hover:bg-violet-500">
            <Plus className="mr-2 size-4" aria-hidden="true" /> {available ? "Adicionar ao carrinho" : "Indisponível"}
          </Button>
        </div>
      </div>
    </article>
  );
}

function CatalogView({ catalog }: { catalog: CommerceCatalog }) {
  const { data: settings } = useQuery(settingsQuery);
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [manualStore, setManualStore] = useState<StoreId | null>(null);
  const [cart, setCart] = useState<ShopCartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [openCart, setOpenCart] = useState(false);
  const [cep, setCep] = useState("");

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCart(parsed.filter(line => line && typeof line.productId === "string" &&
            (line.variantId === null || typeof line.variantId === "string") &&
            Number.isSafeInteger(line.quantity) && line.quantity >= 1 && line.quantity <= 100)
            .slice(0, 80));
        }
      }
    } catch { /* Browser storage is optional. */ }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try { window.sessionStorage.setItem(storageKey, JSON.stringify(cart)); } catch { /* Optional */ }
  }, [hydrated, cart]);

  const live = storefrontProducts(catalog);
  const visibleCategories = catalog.categories.filter(c => c.enabled).sort((a, b) => a.order - b.order);
  const visible = live.filter(p =>
    (category === "all" || p.categoryId === category) &&
    (!query.trim() || [p.name, p.description, p.sku].some(v => v.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR").trim()))),
  );
  const stockEligible = units.filter(id => resolveCart(catalog, cart, id).ok);
  const provisionalStore = stockEligible[0] ?? "quitauna";
  const provisionalResolution = resolveCart(catalog, cart, provisionalStore);
  const baseSubtotal = provisionalResolution.ok ? provisionalResolution.subtotalCents : 0;
  const postalCode = digits(cep);
  const postalLookup = useQuery({
    queryKey: ["commerce-postal", postalCode],
    queryFn: ({ signal }) => lookupCep(postalCode, signal),
    enabled: postalCode.length === 8 && cart.length > 0,
    staleTime: 300_000,
    retry: false,
  });
  const postal = postalLookup.data && digits(postalLookup.data.cep) === postalCode ? postalLookup.data : null;
  const zoneMatches = settings && postal ? stockEligible.flatMap(id => {
    const value = calculateZoneQuote(
      settings.deliveryPricingDemo[id], postal.city, postal.district, baseSubtotal / 100,
    );
    return value ? [{ storeId: id, quote: value }] : [];
  }).sort((a,b) => a.quote.fee - b.quote.fee) : [];
  const origins = units.flatMap(id => {
    const point = settings?.deliveryStores[id]?.coordinates;
    return point ? [{ id, coordinates: point }] : [];
  });
  const preferredZone = manualStore ? zoneMatches.find(z => z.storeId === manualStore) : zoneMatches[0];
  const roadQuery = useQuery({
    queryKey: ["commerce-roads", postalCode, JSON.stringify(origins), JSON.stringify(postal?.coordinates)],
    enabled: stockEligible.length > 0 && !!postal?.coordinates && origins.length > 0 && !preferredZone,
    queryFn: ({ signal }) => calculateDemoRoadRoutes(origins, postal!.coordinates!, signal),
    staleTime: 600_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const eligibleRoads = settings ? (roadQuery.data ?? []).filter(route => {
    if (!stockEligible.includes(route.storeId)) return false;
    return calculateDeliveryQuote(
      settings.deliveryPricingDemo[route.storeId], route.km, baseSubtotal / 100,
    ).status === "ok";
  }).sort((a,b) => a.km - b.km) : [];
  const store = manualStore ?? preferredZone?.storeId ?? eligibleRoads[0]?.storeId ?? provisionalStore;
  const cartResolution = resolveCart(catalog, cart, store);
  const subtotalCents = cartResolution.ok ? cartResolution.subtotalCents : 0;
  const zone = settings && postal
    ? calculateZoneQuote(settings.deliveryPricingDemo[store], postal.city, postal.district, subtotalCents / 100)
    : null;
  const matchedRoad = roadQuery.data?.find(r => r.storeId === store);
  const roadQuote = matchedRoad && settings
    ? calculateDeliveryQuote(settings.deliveryPricingDemo[store], matchedRoad.km, subtotalCents / 100)
    : null;
  const quote = cartResolution.ok ? zone ?? (roadQuote?.status === "ok" ? roadQuote : null) : null;
  const totalCents = quote && cartResolution.ok ? subtotalCents + Math.round(quote.fee * 100) : null;
  const cartCount = cart.reduce((total, line) => total + line.quantity, 0);

  function add(productId: string, variantId: string | null) {
    const next = [...cart];
    const index = next.findIndex(v => v.productId === productId && v.variantId === variantId);
    if (index >= 0) next[index] = { ...next[index], quantity: next[index].quantity + 1 };
    else next.push({ productId, variantId, quantity: 1 });
    if (!resolveCart(catalog, next, store).ok) return;
    setCart(next);
    setOpenCart(true);
  }

  function changeQty(index: number, amount: number) {
    const next = cart.map((line, i) => i === index ? { ...line, quantity: line.quantity + amount } : line)
      .filter(line => line.quantity > 0);
    if (next.length && !resolveCart(catalog, next, store).ok && amount > 0) return;
    setCart(next);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 py-4">
          <a href="/" className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-4" /> Voltar
          </a>
          <div className="text-center">
            <p className="font-display text-xl font-black tracking-tighter sm:text-2xl">CRAZY<span className="text-violet-400"> COMMERCE</span></p>
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Loja de produtos e acessórios</p>
          </div>
          <Button type="button" variant="outline" onClick={() => setOpenCart(v => !v)} className="h-10 rounded-xl">
            <ShoppingBag className="mr-2 size-4" /> <span className="tabular-nums">{cartCount}</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-7 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-card px-6 py-10 sm:px-12 sm:py-14">
          <div className="pointer-events-none absolute -right-10 -top-20 size-80 rounded-full bg-violet-600/15 blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-violet-400">Uma loja, infinitas possibilidades</p>
            <h1 className="mt-3 font-display text-3xl font-black tracking-tight sm:text-5xl">
              Tecnologia, acessórios e <span className="text-violet-400">muito mais.</span>
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Explore as novidades cadastradas pela loja, escolha a versão certa e confira os valores.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-background/70 px-3 py-2 text-xs font-medium">
              <Check className="size-4 text-violet-400" /> Prévia do catálogo · pagamentos ainda não habilitados
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_350px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setCategory("all")}
                className={buttonNeutral + (category === "all" ? " border-violet-500 bg-violet-500/10 text-violet-400" : "")}>Todos</button>
              {visibleCategories.map(c => <button key={c.id} type="button" onClick={() => setCategory(c.id)}
                className={buttonNeutral + (category === c.id ? " border-violet-500 bg-violet-500/10 text-violet-400" : "")}>{c.name}</button>)}
            </div>
            <label className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-card px-3">
              <Search className="size-4 text-muted-foreground" aria-hidden="true" />
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar produtos, modelos ou acessórios..."
                className="h-12 border-0 bg-transparent text-sm focus-visible:ring-0" />
            </label>
            {visible.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-border bg-card px-4 py-16 text-center">
                <ShoppingBag className="mx-auto size-12 text-violet-400/60" aria-hidden="true" />
                <p className="mt-4 text-lg font-black">Novidades em preparação</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  Assim que a loja publicar produtos de suas categorias, eles aparecerão aqui com seus preços.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map(p => <ProductTile key={p.id} p={p}
                  category={catalog.categories.find(c => c.id === p.categoryId)?.name ?? "Produto"}
                  store={store} add={add} />)}
              </div>
            )}
          </div>
          <aside className={(openCart ? "block" : "hidden") + " lg:block"}>
            <div className="rounded-2xl border border-border bg-card p-4 lg:sticky lg:top-24">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-black">Seu carrinho</h2>
                <button type="button" className="rounded-lg p-2 text-muted-foreground lg:hidden" onClick={() => setOpenCart(false)} aria-label="Fechar carrinho">
                  <X className="size-5" />
                </button>
              </div>
              {cart.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">Adicione um produto para começar.</p>
                : !cartResolution.ok ? (
                  <div role="alert" className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                    <p className="text-amber-500">
                      {cartResolution.reason}. Confira a unidade e a disponibilidade dos itens.
                    </p>
                    <Button variant="outline" className="mt-3 w-full" type="button" onClick={() => setCart([])}>
                      Limpar carrinho
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {cartResolution.lines.map((line, index) => (
                      <div key={line.key} className="rounded-xl border border-border bg-background/60 p-3">
                        <div className="text-sm font-bold">{line.name}</div>
                        {line.variantLabel && <p className="text-xs text-muted-foreground">{line.variantLabel}</p>}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-sm font-bold tabular-nums">{formatBRL(line.totalCents)}</span>
                          <div className="flex items-center gap-2">
                            <button type="button" aria-label={"Remover unidade de " + line.name} onClick={() => changeQty(index, -1)}><Minus className="size-4" /></button>
                            <span className="text-sm tabular-nums">{line.quantity}</span>
                            <button type="button" aria-label={"Adicionar unidade de " + line.name} onClick={() => changeQty(index, 1)}><Plus className="size-4" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              <div className="mt-5 space-y-3 border-t border-border pt-4">
                <label className="block text-xs font-semibold text-muted-foreground">
                  Unidade de atendimento
                  <select value={store} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                    onChange={e => setManualStore(e.target.value as StoreId)}>
                    {units.map(id => <option key={id} value={id}>{storeNames[id]} · Osasco</option>)}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-muted-foreground">
                  CEP para estimar entrega
                  <Input value={cep} inputMode="numeric" autoComplete="postal-code" placeholder="00000-000"
                    onChange={e => setCep(formatCep(e.target.value))} className="mt-1 h-11 text-base" />
                </label>
                {postalLookup.isFetching && <p role="status" className="text-xs text-violet-400">Consultando CEP...</p>}
                {postal && <p className="text-xs text-muted-foreground">
                  <MapPin className="mr-1 inline size-3.5" />{[postal.district, postal.city].filter(Boolean).join(" · ")}
                </p>}
                {roadQuery.isFetching && <p role="status" className="text-xs text-violet-400">Calculando distância...</p>}
                <div className="space-y-2 rounded-xl border border-border bg-background/60 p-3 text-sm">
                  <div className="flex justify-between gap-2 text-muted-foreground">
                    <span>Subtotal</span><strong className="text-foreground">{cartResolution.ok ? formatBRL(subtotalCents) : "—"}</strong>
                  </div>
                  <div className="flex justify-between gap-2 text-muted-foreground">
                    <span>Frete estimado</span><strong className="text-foreground">{quote ? formatBRL(Math.round(quote.fee * 100)) : "A calcular"}</strong>
                  </div>
                  <div className="flex justify-between gap-2 border-t border-border pt-2 font-black">
                    <span>Total</span><span className="tabular-nums text-violet-400">{totalCents === null ? "—" : formatBRL(totalCents)}</span>
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  <Truck className="mr-1 inline size-3.5" />
                  Frete calculado por região ou rota demonstrativa. O total final comercial
                  será revalidado pelo servidor ao ativar os pagamentos.
                </p>
                <Button type="button" disabled className="h-11 w-full rounded-xl opacity-70">
                  <CreditCard className="mr-2 size-4" /> Pagamento em configuração
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </main>
      {cartCount > 0 && !openCart && (
        <button type="button" onClick={() => setOpenCart(true)}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-violet-600 px-5 py-4 text-sm font-black text-white shadow-xl lg:hidden">
          <ShoppingBag className="size-5" /> Abrir carrinho ({cartCount})
        </button>
      )}
    </div>
  );
}

export function UniversalStorefront() {
  const { data, isPending, isError } = useQuery(commerceCatalogQuery);
  if (isPending) return <div className="grid min-h-screen place-items-center bg-background p-6 text-sm text-muted-foreground">Carregando novidades...</div>;
  if (isError || !data) return <div className="grid min-h-screen place-items-center bg-background p-6 text-sm text-destructive">Não foi possível carregar o catálogo.</div>;
  return <CatalogView catalog={data} />;
}
