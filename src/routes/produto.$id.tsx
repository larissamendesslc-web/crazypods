import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Minus, Plus, Zap } from "lucide-react";
import { toast } from "sonner";
import { categoriesQuery, productQuery, productsQuery } from "@/lib/queries";
import { ProductStage } from "@/components/site/ProductStage";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { cartKey } from "@/lib/cart-math";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/produto/$id")({
  head: () => ({
    meta: [
      { title: "Produto — Crazy" },
      { name: "description", content: "Escolha o sabor, a quantidade e adicione ao carrinho na Crazy." },
      { property: "og:title", content: "Produto Crazy" },
      { property: "og:description", content: "Veja sabores, detalhes e compre na Crazy." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const { data: p, isLoading } = useQuery(productQuery(id));
  const { data: cats = [] } = useQuery(categoriesQuery);
  const { data: all = [] } = useQuery(productsQuery);
  const cart = useCart();
  const [flavor, setFlavor] = useState("");
  const [qty, setQty] = useState(1);

  useEffect(() => { if (p) { setFlavor(p.flavors[0] ?? ""); setQty(1); document.title = `${p.name} — Crazy`; } }, [p]);

  if (isLoading) return <div className="mx-auto mt-10 aspect-square max-w-lg animate-pulse rounded-3xl bg-card" />;
  if (!p) return (
    <div className="py-24 text-center">
      <p className="font-display text-2xl font-bold">Produto não encontrado</p>
      <Link to="/loja" search={{}} className="mt-4 inline-block text-primary">Voltar para a loja</Link>
    </div>
  );
  const brand = cats.find((c) => c.id === p.category_id);
  const out = p.stock <= 0;
  const related = all.filter((x) => x.id !== p.id && x.category_id === p.category_id).slice(0, 4);

  const add = () => {
    if (p.flavors.length > 0 && !flavor) { toast.error("Escolha um sabor"); return; }
    cart.add({ key: cartKey(p.id, flavor), product_id: p.id, name: p.name, price: Number(p.price), image_url: p.image_url, flavor, quantity: qty, stock: p.stock, accent_color: p.accent_color });
    toast.success("Adicionado ao carrinho", { action: { label: "Ver", onClick: () => cart.setOpen(true) } });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4">
      <Link to="/loja" search={{ marca: brand?.slug }} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
      <div className="mt-4 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
        <div className="relative min-w-0">
          <ProductStage src={p.image_url} alt={p.name} accent={p.accent_color} size="lg" float className="aspect-square rounded-[2.5rem] border bg-card md:sticky md:top-32" />
          {brand && <span className="text-outline pointer-events-none absolute bottom-4 left-6 right-6 break-words pr-2 font-display text-3xl font-black uppercase italic opacity-50 sm:text-5xl">{brand.name}</span>}
        </div>
        <div className="min-w-0 animate-rise">
          {brand && <Link to="/loja" search={{ marca: brand.slug }} className="text-xs font-bold uppercase tracking-[.3em] text-primary">{brand.name}</Link>}
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-5xl">{p.name}</h1>
          {p.puffs && <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-bold"><Zap className="h-3.5 w-3.5 text-primary" /> {p.puffs} puffs</p>}
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <span className="max-w-full break-words font-display text-3xl font-black sm:text-4xl">{formatBRL(Number(p.price))}</span>
            {p.compare_price && Number(p.compare_price) > Number(p.price) && <span className="pb-1 text-lg text-muted-foreground line-through">{formatBRL(Number(p.compare_price))}</span>}
          </div>

          {p.flavors.length > 0 && (
            <div className="mt-8">
              <p className="mb-3 text-sm font-bold">Sabor: <span className="text-primary">{flavor}</span></p>
              <div className="flex flex-wrap gap-2">
                {p.flavors.map((f) => (
                  <Button variant="outline" key={f} onClick={() => setFlavor(f)} className={`h-auto max-w-full whitespace-normal break-words rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${flavor === f ? "border-primary bg-primary/15 text-foreground shadow-glow" : "text-muted-foreground hover:border-foreground/30"}`}>
                    {flavor === f && <Check className="h-3.5 w-3.5 text-primary" />} {f}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="flex h-14 shrink-0 items-center self-start rounded-full border">
              <button className="grid h-14 w-12 place-items-center" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Diminuir"><Minus className="h-4 w-4" /></button>
              <span className="w-8 text-center font-display font-bold">{qty}</span>
              <button className="grid h-14 w-12 place-items-center disabled:opacity-30" disabled={qty >= p.stock} onClick={() => setQty(Math.min(p.stock, qty + 1))} aria-label="Aumentar"><Plus className="h-4 w-4" /></button>
            </div>
            <Button variant="neon" size="xl" className="min-w-0 flex-1 whitespace-normal" disabled={out} onClick={add}>{out ? "Esgotado" : "Adicionar ao carrinho"}</Button>
          </div>
          <p className={`mt-3 text-xs font-semibold ${p.stock > 0 && p.stock <= 5 ? "text-accent" : "text-muted-foreground"}`}>
            {out ? "Sem estoque no momento" : p.stock <= 5 ? `Últimas ${p.stock} unidades!` : "Em estoque • pronta entrega"}
          </p>

          {p.description && (
            <div className="mt-10 border-t pt-6">
              <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-widest">Descrição</h2>
              <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{p.description}</p>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 text-2xl font-bold">Você também vai curtir</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{related.map((r, i) => <ProductCard key={r.id} product={r} brand={brand?.name} index={i} />)}</div>
        </section>
      )}
    </div>
  );
}