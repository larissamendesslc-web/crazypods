import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Truck, ShieldCheck, Zap } from "lucide-react";
import heroSmoke from "@/assets/hero-smoke.jpg";
import { Button } from "@/components/ui/button";
import { categoriesQuery, productsQuery } from "@/lib/queries";
import { ProductCard } from "@/components/site/ProductCard";
import { ProductStage } from "@/components/site/ProductStage";
import christmasScene from "@/assets/christmas-scene.jpg";
import christmasHat from "@/assets/christmas-hat.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Crazy — Sinta o impacto | Pods e vapes" },
      { name: "description", content: "Ignite, Elfbar, LostMary, Waka e mais. Escolha seu sabor e receba rápido na Crazy." },
      { property: "og:title", content: "Crazy — Sinta o impacto" },
      { property: "og:description", content: "As melhores marcas de pods num só lugar, com entrega rápida." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: products = [] } = useQuery(productsQuery);
  const { data: cats = [] } = useQuery(categoriesQuery);
  const brandName = (id: string | null) => cats.find((c) => c.id === id)?.name;
  const hero = products.find((p) => p.featured && p.image_url) ?? products.find((p) => p.image_url);

  return (
    <>
      <section className="christmas-only winter-cover">
        <img src={christmasScene} alt="Presentes com laços vermelhos e ramos de pinheiro" width={1536} height={1024} className="winter-cover-image" />
        <div className="mx-auto flex min-h-[440px] max-w-7xl items-center px-6 py-12 md:min-h-[560px] md:px-8">
          <div className="max-w-xl animate-rise">
            <p className="mb-5 text-xs font-bold uppercase text-accent">Crazy · edição de Natal</p>
            <h1 className="winter-heading font-black">Crazy.<br /><strong>Um Natal<br />fora do comum.</strong></h1>
            <p className="mt-6 max-w-sm text-base text-muted-foreground">Suas marcas favoritas. Um toque de magia. Tudo em um só lugar.</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button asChild variant="neon" size="xl" className="relative"><Link to="/loja" search={{}}>Explorar a loja <ArrowRight /><img src={christmasHat} alt="" aria-hidden loading="lazy" width={816} height={816} className="festive-button-hat" /></Link></Button>
              <Button asChild variant="outline" size="xl"><a href="#marcas">Ver marcas</a></Button>
            </div>
          </div>
        </div>
        <div className="winter-ribbon flex items-center justify-center gap-4 px-4 py-4 text-center text-xs font-bold uppercase"><span>✦</span> Natal Crazy <span>✦</span> Feito para surpreender <span>✦</span></div>
      </section>
      <section className="non-christmas relative -mt-px overflow-hidden">
        <img src={heroSmoke} alt="" width={1600} height={1008} className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/40 to-background" />
        <div className="relative mx-auto grid min-h-[calc(100svh-7rem)] max-w-7xl items-center gap-6 px-4 py-12 md:grid-cols-2">
          <div className="animate-rise">
            <p className="text-xs font-bold uppercase tracking-[.35em] text-primary">Nova era do sabor</p>
            <h1 className="mt-4 text-5xl font-black uppercase italic leading-[1.1] sm:text-7xl lg:text-8xl">
              Sinta<br /><span className="text-gradient-brand">o impacto</span>
            </h1>
            <p className="mt-6 max-w-md text-base text-muted-foreground sm:text-lg">
              As marcas mais desejadas, os sabores mais insanos. Escolha, peça e receba rápido.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="neon" size="xl"><Link to="/loja" search={{}}>Comprar agora <ArrowRight /></Link></Button>
              <Button asChild variant="glass" size="xl"><a href="#marcas">Ver marcas</a></Button>
            </div>
          </div>
          <div className="relative hidden aspect-square md:block">
            {hero ? (
              <Link to="/produto/$id" params={{ id: hero.id }} className="group block h-full">
                <ProductStage src={hero.image_url} alt={hero.name} accent={hero.accent_color} size="lg" float className="h-full rounded-full" />
              </Link>
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-outline select-none font-display text-[12rem] font-black italic">CRZ</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="marcas" className="border-y bg-surface py-6">
        <div className="flex overflow-hidden">
          <div className="flex w-max animate-marquee gap-12 whitespace-nowrap">
            {[...cats, ...cats, ...cats, ...cats].map((c, i) => (
              <span key={i} className={`px-1 py-2 font-display text-3xl font-black uppercase italic sm:text-5xl ${i % 2 ? "text-outline" : "text-foreground"}`}>{c.name}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold sm:text-4xl">Escolha <span className="text-primary">sua marca</span></h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cats.map((c, i) => (
            <Link
              key={c.id}
              to="/loja"
              search={{ marca: c.slug }}
              className="group relative flex aspect-[4/3] animate-rise flex-col justify-end overflow-hidden rounded-3xl border bg-card p-4 transition-all hover:border-primary/50"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {c.logo_url ? (
                <img src={c.logo_url} alt={`Logo ${c.name}`} loading="lazy" className="absolute inset-x-5 top-[18%] mx-auto h-[40%] w-[calc(100%-2.5rem)] object-contain drop-shadow-[0_0_18px_rgba(0,0,0,.5)] transition-transform duration-500 group-hover:scale-110" />
              ) : (
                <span className="text-outline absolute -right-3 -top-4 font-display text-7xl font-black italic opacity-60 transition-transform duration-500 group-hover:-translate-x-2">{c.name.slice(0, 2)}</span>
              )}
              <span className={c.logo_url ? "sr-only" : "break-words pr-2 font-display text-base font-black uppercase leading-relaxed sm:text-xl"}>{c.name}</span>
              <span className="mt-1 pr-6 text-xs text-muted-foreground">{c.tagline}</span>
              <ArrowRight className="absolute bottom-4 right-4 h-5 w-5 text-primary transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-20">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold sm:text-4xl">Em <span className="text-gradient-brand">alta</span></h2>
          <Link to="/loja" search={{}} className="text-sm font-bold text-primary">Ver tudo →</Link>
        </div>
        {products.length === 0 ? (
          <div className="rounded-3xl border border-dashed p-12 text-center">
            <p className="font-display text-2xl font-bold">Novidades chegando</p>
            <p className="mt-2 text-muted-foreground">Os primeiros produtos estão a caminho. Volte em breve.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.slice(0, 8).map((p, i) => <ProductCard key={p.id} product={p} brand={brandName(p.category_id)} index={i} />)}
          </div>
        )}
      </section>

      <section className="mx-auto mt-20 grid max-w-7xl gap-3 px-4 sm:grid-cols-3">
        {[
          { icon: Zap, t: "Pedido em segundos", d: "Escolha, confirme e pronto." },
          { icon: Truck, t: "Entrega rápida", d: "Acompanhe tudo pelo WhatsApp." },
          { icon: ShieldCheck, t: "Produtos originais", d: "Só marcas de confiança." },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="flex items-center gap-4 rounded-3xl border bg-card p-5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-6 w-6" /></span>
            <div><p className="font-display font-bold">{t}</p><p className="text-sm text-muted-foreground">{d}</p></div>
          </div>
        ))}
      </section>
    </>
  );
}