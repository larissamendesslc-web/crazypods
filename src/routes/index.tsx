import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ArrowUpRight, Package, ShieldCheck, Sparkles, Truck, Zap } from "lucide-react";
import { categoriesQuery, productsQuery } from "@/lib/queries";
import { ProductCard } from "@/components/site/ProductCard";
import { defaultHome, homeDesignQuery, homeFeatureCardsQuery, validHomeLink } from "@/lib/home-design";
import { settingsQuery } from "@/lib/queries";
import { SmokeFX } from "@/components/site/SmokeFX";
import type { CSSProperties } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Crazy Pods — Uma nova experiência" },
      { name: "description", content: "Descubra a vitrine Crazy Pods. Explore produtos reais, novidades e ofertas em uma experiência feita para surpreender." },
      { property: "og:title", content: "Crazy Pods — Uma nova experiência" },
      { property: "og:description", content: "Uma experiência premium com a identidade Crazy Pods." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function ActionLink({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  return <a href={validHomeLink(href) ? href : "/loja"} className={className}>{children}</a>;
}

function Home() {
  const { data: stored } = useQuery(homeDesignQuery);
  const home = stored ?? defaultHome;
  const {data:siteSettings} = useQuery(settingsQuery);
  const isSmoke = siteSettings?.theme === "smoke";
  const { data: slots = [] } = useQuery(homeFeatureCardsQuery);
  const { data: products = [], isPending: productsPending } = useQuery(productsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const visibleCards = slots.filter((card) => card.active && card.title.trim());
  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name;

  return (
    <div className="crazy-premium-home">
      <section className="crazy-premium-hero" aria-label="Boas-vindas à Crazy Pods">
        <img
          src={home.background_url || (isSmoke ? "/crazy-smoke-wisp.svg" : "/crazy-premium-scene.svg")}
          className={`crazy-hero-backdrop ${home.background_url ? "" : "crazy-demo-scene"}`}
          alt=""
          aria-hidden="true"
          width={1680}
          height={960}
          fetchPriority="high"
        />
        <div className="crazy-hero-vignette" aria-hidden="true" />
        {isSmoke && <SmokeFX enabled={home.smoke_enabled} intensity={home.smoke_intensity} motion={home.motion_preset} />}
        <div className="crazy-hero-grid">
          <div className="crazy-hero-copy animate-rise">
            <p className="crazy-hero-eyebrow"><Sparkles size={14} aria-hidden="true" /> {home.eyebrow}</p>
            <h1>{home.title}<span>{home.highlight}</span></h1>
            <p className="crazy-hero-description">{home.subtitle}</p>
            <div className="crazy-hero-actions">
              <ActionLink href={home.primary_link} className="crazy-cta-primary">{home.primary_label} <ArrowRight size={19} aria-hidden="true" /></ActionLink>
              <ActionLink href={home.secondary_link} className="crazy-cta-secondary">{home.secondary_label} <ArrowUpRight size={17} aria-hidden="true" /></ActionLink>
            </div>
            <div className="crazy-hero-proof">
              <span><ShieldCheck size={18} aria-hidden="true" /> Compra com conta protegida</span>
              <span><Truck size={18} aria-hidden="true" /> Entrega acompanhada</span>
            </div>
          </div>

          <div className={`crazy-showcase ${isSmoke ? "crazy-smoke-showcase" : ""}`} style={{"--hero-art-scale": home.hero_art_scale / 100} as CSSProperties} aria-label="Vitrine visual editável da Crazy Pods">
            {isSmoke && <div className="crazy-smoke-bag-scene" aria-hidden="true">
              <img src="/crazy-smoke-bag.svg" alt="" width={960} height={950} decoding="async" />
              <span className="crazy-smoke-halo" />
            </div>}
            <div className="crazy-stage-glow" aria-hidden="true" />
            <div className="crazy-glass-orbit" aria-hidden="true" />
            <div className="crazy-showcase-main">
              {home.center_image_url ? (
                <img src={home.center_image_url} alt={home.center_caption || "Imagem em destaque"} className="crazy-showcase-cutout crazy-main-cutout" decoding="async" />
              ) : (
                <img src="/crazy-writing-pen.svg" alt="Ilustração demonstrativa de caneta de escrever" className="crazy-showcase-cutout crazy-demo-illustration crazy-main-cutout" decoding="async" />
              )}
              <span className="crazy-showcase-main-label">{home.center_caption}</span>
            </div>
            {(!isSmoke || home.show_side_art || !!home.left_image_url) && <div className="crazy-float-card crazy-float-left">
              <div className="crazy-float-visual">
                {home.left_image_url ? <img src={home.left_image_url} alt={home.left_caption || "Arte à esquerda"} className="crazy-showcase-cutout" loading="lazy" decoding="async" /> : <img src="/crazy-writing-pen.svg" alt="Ilustração demonstrativa de caneta de escrever" className="crazy-showcase-cutout crazy-demo-illustration" decoding="async" loading="lazy" />}
              </div>
              <span>{home.left_caption}</span>
            </div>}
            {(!isSmoke || home.show_side_art || !!home.right_image_url) && <div className="crazy-float-card crazy-float-right">
              <div className="crazy-float-visual">
                {home.right_image_url ? <img src={home.right_image_url} alt={home.right_caption || "Arte à direita"} className="crazy-showcase-cutout" loading="lazy" decoding="async" /> : <img src="/crazy-writing-pen.svg" alt="Ilustração demonstrativa de caneta de escrever" className="crazy-showcase-cutout crazy-demo-illustration" decoding="async" loading="lazy" />}
              </div>
              <span>{home.right_caption}</span>
            </div>}
          </div>
        </div>
        <div className="crazy-hero-bottom-glow" aria-hidden="true" />
      </section>

      <section className="crazy-promise-strip" aria-label="Experiência de compra">
        <div><Zap size={22} aria-hidden="true" /><span><strong>Vitrine renovada</strong><small>Escolhas em destaque</small></span></div>
        <div><ShieldCheck size={22} aria-hidden="true" /><span><strong>Compra com confiança</strong><small>Seus pedidos na sua conta</small></span></div>
        <div><Truck size={22} aria-hidden="true" /><span><strong>Acompanhe sua entrega</strong><small>Da confirmação à chegada</small></span></div>
      </section>

      <section id="destaques" className="crazy-premium-section crazy-feature-section">
        <div className="crazy-section-heading">
          <p className="crazy-section-kicker">CONHEÇA A CRAZY PODS</p>
          <h2>Explore nossos <span>destaques</span></h2>
          <p>Uma vitrine diferente a cada novidade. Descubra o que a loja preparou para você.</p>
        </div>
        {visibleCards.length > 0 ? (
          <div className="crazy-editorial-grid">
            {visibleCards.map((card) => (
              <ActionLink key={card.slot} href={card.target_link} className="crazy-editorial-card">
                <div className="crazy-card-ambient" aria-hidden="true" />
                <div className="crazy-card-art">
                  {card.image_url ? <img src={card.image_url} alt={card.title} loading="lazy" decoding="async" /> : <Package size={72} strokeWidth={1} aria-hidden="true" />}
                </div>
                <div className="crazy-editorial-label">
                  <div><h3>{card.title}</h3>{card.subtitle && <p>{card.subtitle}</p>}</div>
                  <span className="crazy-editorial-arrow"><ArrowUpRight size={18} aria-hidden="true" /></span>
                </div>
              </ActionLink>
            ))}
          </div>
        ) : categories.length > 0 ? (
          <div className="crazy-editorial-grid">
            {categories.slice(0, 4).map((category) => (
              <Link key={category.id} to="/loja" search={{ marca: category.slug }} className="crazy-editorial-card">
                <div className="crazy-card-ambient" aria-hidden="true" />
                <div className="crazy-card-art">{category.logo_url ? <img src={category.logo_url} alt="" loading="lazy" /> : <Package size={72} strokeWidth={1} aria-hidden="true" />}</div>
                <div className="crazy-editorial-label">
                  <div><h3>{category.name}</h3>{category.tagline && <p>{category.tagline}</p>}</div>
                  <span className="crazy-editorial-arrow"><ArrowUpRight size={18} aria-hidden="true" /></span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="crazy-empty-spotlight">
            <div className="crazy-empty-symbol" aria-hidden="true"><Sparkles size={48} strokeWidth={1.2} /></div>
            <div>
              <h3>Novas seleções em breve</h3>
              <p>A vitrine de destaques será atualizada conforme novas coleções chegarem.</p>
            </div>
            <Link to="/loja" search={{}} className="crazy-empty-link">Acessar loja <ArrowRight size={17} /></Link>
          </div>
        )}
      </section>

      <section className="crazy-premium-section crazy-products-section">
        <div className="crazy-products-head">
          <div><p className="crazy-section-kicker">SELEÇÃO DA LOJA</p><h2>Na vitrine <span>agora</span></h2></div>
          <Link to="/loja" search={{}} className="crazy-see-all">Ver loja inteira <ArrowRight size={18} /></Link>
        </div>
        {productsPending ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[0,1,2,3].map(i=><div key={i} className="aspect-[3/4] animate-pulse rounded-3xl bg-card" />)}</div>
        ) : products.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.slice(0, 8).map((product, index) => <ProductCard key={product.id} product={product} brand={categoryName(product.category_id)} index={index} />)}
          </div>
        ) : (
          <div className="crazy-no-products"><Sparkles className="mx-auto mb-4 text-primary" size={34}/><h3>A próxima novidade pode estar chegando</h3><p>O catálogo será atualizado assim que novos produtos estiverem disponíveis.</p></div>
        )}
      </section>

      <section className="crazy-last-call crazy-premium-section">
        <div><p className="crazy-section-kicker">CRAZY PODS</p><h2>Seu próximo achado merece <span>uma experiência à altura.</span></h2></div>
        <Link to="/loja" search={{}} className="crazy-cta-primary">Explorar a loja <ArrowRight size={19} /></Link>
      </section>
    </div>
  );
}
