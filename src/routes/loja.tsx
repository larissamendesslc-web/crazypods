import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { categoriesQuery, productsQuery } from "@/lib/queries";
import { ProductCard } from "@/components/site/ProductCard";
import { Input } from "@/components/ui/input";
import christmasScene from "@/assets/christmas-scene.jpg";

export const Route = createFileRoute("/loja")({
  validateSearch: (s: Record<string, unknown>): { marca?: string | undefined } => ({
    marca: typeof s["marca"] === "string" ? s["marca"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Loja — Crazy" },
      { name: "description", content: "Confira todos os produtos da loja. Filtre por categoria e escolha sua opção." },
      { property: "og:title", content: "Loja Crazy" },
      { property: "og:description", content: "Filtre por marca e encontre seu próximo sabor favorito." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Shop,
});

function Shop() {
  const { marca } = Route.useSearch();
  const [q, setQ] = useState("");
  const { data: products = [], isLoading } = useQuery(productsQuery);
  const { data: cats = [] } = useQuery(categoriesQuery);
  const current = cats.find((c) => c.slug === marca);
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.filter(
      (p) => (!current || p.category_id === current.id) &&
        (!term || p.name.toLowerCase().includes(term) || p.flavors.some((f) => f.toLowerCase().includes(term))),
    );
  }, [products, current, q]);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8">
      <div className="christmas-only winter-collection mb-6">
        <img src={christmasScene} alt="" aria-hidden width={1536} height={1024} loading="lazy" className="winter-collection-image" />
        <p className="relative text-xs font-bold uppercase text-accent">✦ Edição de Natal · Crazy</p>
        <p className="relative mt-2 font-display text-2xl font-bold sm:text-3xl">O inverno chegou.<br /><span className="text-primary">A vibe é Crazy.</span></p>
      </div>
      <h1 className="pr-3 text-3xl font-black uppercase italic leading-relaxed sm:text-6xl">
        {current ? <span className="text-gradient-brand">{current.name}</span> : <>A <span className="text-gradient-brand">loja</span></>}
      </h1>
      {current?.tagline && <p className="mt-2 text-muted-foreground">{current.tagline}</p>}

      <div className="sticky top-[7.5rem] z-30 -mx-4 mt-6 space-y-3 bg-background/85 px-4 py-3 backdrop-blur md:top-[6.5rem]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto ou sabor..." className="h-12 rounded-full pl-11" />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          <Chip active={!current} to={undefined}>Todas</Chip>
          {cats.map((c) => <Chip key={c.id} active={current?.id === c.id} to={c.slug}>{c.logo_url && <img src={c.logo_url} alt="" className="h-4 w-auto max-w-10 object-contain" />}{c.name}</Chip>)}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-3xl bg-card" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed p-12 text-center">
          <p className="font-display text-xl font-bold">Nada por aqui ainda</p>
          <p className="mt-2 text-sm text-muted-foreground">Tente outra marca ou busca.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {list.map((p, i) => <ProductCard key={p.id} product={p} brand={cats.find((c) => c.id === p.category_id)?.name} index={i} />)}
        </div>
      )}
    </div>
  );
}

function Chip({ active, to, children }: { active: boolean; to: string | undefined; children: React.ReactNode }) {
  return (
    <Link
      to="/loja"
      search={{ marca: to }}
      className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </Link>
  );
}