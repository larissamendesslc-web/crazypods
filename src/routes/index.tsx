import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ArrowUpRight, Package, ShieldCheck, Sparkles, Truck, Zap, ShoppingBag } from "lucide-react";
import { categoriesQuery, productsQuery, settingsQuery } from "@/lib/queries";
import { ProductCard } from "@/components/site/ProductCard";
import { ProductStage } from "@/components/site/ProductStage";
import { defaultHome, homeDesignQuery, homeFeatureCardsQuery, validHomeLink } from "@/lib/home-design";
import { homeThemeVariantsQuery, resolveThemeCopy, resolveThemeVariant } from "@/lib/theme-variants";
import { normalizeStoreTheme, themeExperience } from "@/lib/theme-experience";
import { SmokeFX } from "@/components/site/SmokeFX";
import type { CSSProperties, ReactNode } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Crazy Pods — Sinta o impacto" },
      { name: "description", content: "Explore a Crazy Pods: vitrine, novidades, produtos e pedidos em um só lugar." },
      { property: "og:title", content: "Crazy Pods — Sinta o impacto" },
      { property: "og:description", content: "Descubra a experiência Crazy Pods." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function SafeLink({ href, children, className }: { href:string; children: ReactNode; className:string }) {
  return <a href={validHomeLink(href) ? href : "/loja"} className={className}>{children}</a>;
}

function Home() {
  const {data:settings}=useQuery(settingsQuery);
  const theme=normalizeStoreTheme(settings?.theme);
  const experience=themeExperience(theme);
  const {data:stored}=useQuery(homeDesignQuery);
  const home=stored??defaultHome;
  const {data:variants=[]}=useQuery(homeThemeVariantsQuery);
  const selected=resolveThemeVariant(theme,variants);
  const copy=resolveThemeCopy(theme,home,selected);
  const {data:slots=[]}=useQuery(homeFeatureCardsQuery);
  const {data:products=[],isPending:productsPending}=useQuery(productsQuery);
  const {data:categories=[]}=useQuery(categoriesQuery);
  const actualCategories=categories.filter(c=>products.some(p=>p.category_id===c.id));
  const brandName=(id:string|null)=>categories.find(c=>c.id===id)?.name;
  const cards=slots.filter(c=>c.active&&c.title.trim());
  const featured=products.find(p=>p.featured&&p.image_url)||products.find(p=>p.image_url);
  const artImage=home.center_image_url||featured?.image_url||null;
  const artAlt=home.center_image_url?(home.center_caption||"Imagem em destaque"):featured?.name||"";
  const themeStage=selected?.background_url?null:experience.art;
  const backgroundUrl=copy.backgroundUrl;
  const showSide=home.show_side_art||!!home.left_image_url||!!home.right_image_url;
  const mainTitle=copy.title.trim();
  const highlight=copy.highlight.trim();

  return (
    <div className={["ffm-home","ffm-home-"+theme].join(" ")} data-heritage-home="true" data-experience={theme}>
      <section className="ffm-hero" aria-label="Bem-vindo à Crazy Pods">
        <div className="ffm-hero-aurora" aria-hidden="true" />
        {backgroundUrl&&<img className="ffm-hero-background" src={backgroundUrl} alt="" aria-hidden="true" fetchPriority="high"/>}
        {theme==="smoke"&&<SmokeFX enabled={home.smoke_enabled} intensity={home.smoke_intensity} motion={home.motion_preset}/>}
        <div className="ffm-hero-shell">
          <div className="ffm-hero-copy animate-rise">
            <span className="ffm-hero-eyebrow"><Sparkles size={15} aria-hidden="true"/>{copy.eyebrow}</span>
            <p className="ffm-hero-edition"><span className="ffm-neon-line"/> CRAZY PODS / ORIGINAL EXPERIENCE</p>
            <h1 className="ffm-hero-title">{mainTitle}<span>{highlight}</span></h1>
            <p className="ffm-hero-description">{copy.subtitle}</p>
            <div className="ffm-hero-actions">
              <SafeLink href={home.primary_link} className="ffm-button ffm-button-primary">{home.primary_label} <ArrowRight size={20} aria-hidden="true"/></SafeLink>
              <SafeLink href={home.secondary_link} className="ffm-button ffm-button-outline">{home.secondary_label} <ArrowUpRight size={19} aria-hidden="true"/></SafeLink>
            </div>
            <div className="ffm-hero-trust">
              <span><ShieldCheck size={17} aria-hidden="true"/> Área de pedidos protegida</span>
              <span><Truck size={17} aria-hidden="true"/> Acompanhe a entrega</span>
            </div>
          </div>
          <div className="ffm-hero-display" style={{"--hero-art-scale":home.hero_art_scale/100} as CSSProperties} aria-label="Vitrine Crazy Pods">
            <div className="ffm-display-ring ffm-display-ring-one" aria-hidden="true"/>
            <div className="ffm-display-ring ffm-display-ring-two" aria-hidden="true"/>
            <div className="ffm-display-light" aria-hidden="true"/>
            {artImage?(
              <div className="ffm-display-product">
                <ProductStage src={artImage} alt={artAlt} accent={featured?.accent_color} size="lg" float className="ffm-display-product-stage h-full w-full"/>
                <span className="ffm-display-caption">{home.center_image_url?home.center_caption:featured?.name}</span>
              </div>
            ):themeStage?(
              <img src={themeStage} className="ffm-display-season" alt="" aria-hidden="true" decoding="async" width={1000} height={950}/>
            ):(
              <div className="ffm-display-brand" aria-hidden="true"><span>CRAZY</span><strong>PODS</strong><small>SINTA O IMPACTO</small></div>
            )}
            {showSide&&home.left_image_url&&<div className="ffm-side-art ffm-side-left"><img src={home.left_image_url} alt={home.left_caption||"Imagem lateral"} loading="lazy"/></div>}
            {showSide&&home.right_image_url&&<div className="ffm-side-art ffm-side-right"><img src={home.right_image_url} alt={home.right_caption||"Imagem lateral"} loading="lazy"/></div>}
            <span className="ffm-display-corner ffm-corner-top">CRAZY / 01</span>
            <span className="ffm-display-corner ffm-corner-bottom">EST. 2026 ✦ VIBE ORIGINAL</span>
          </div>
        </div>
        <div className="ffm-hero-bottom" aria-hidden="true"/>
      </section>

      <div className="ffm-marquee" aria-label="Categorias e novidades">
        <div className="ffm-marquee-track">
          {Array.from({length:4},(_,i)=><span key={i} aria-hidden={i>0}>
            {(actualCategories.length?actualCategories.map(c=>c.name):["CRAZY PODS","NOVA EXPERIÊNCIA","SINTA O IMPACTO"]).map((name,j)=>
              <b key={j} className={j%2?"ffm-outline-word":"ffm-gradient-word"}>{name}<em>✦</em></b>
            )}
          </span>)}
        </div>
      </div>

      <section id="marcas" className="ffm-section ffm-categories">
        <div className="ffm-section-heading">
          <div><p className="ffm-kicker">UNIVERSO CRAZY · 01</p><h2>Escolha <span>sua vibe.</span></h2><p>Descubra as categorias disponíveis e encontre seu próximo favorito.</p></div>
          <Link to="/loja" search={{}} className="ffm-text-link">Ver catálogo <ArrowUpRight size={18}/></Link>
        </div>
        {cards.length?(
          <div className="ffm-category-grid">
            {cards.map((card,i)=><SafeLink key={card.slot} href={card.target_link} className="ffm-category-card" >
              <div className="ffm-category-art">
                {card.image_url?<img src={card.image_url} alt="" loading="lazy"/>:<Package size={68} aria-hidden="true"/>}
              </div>
              <div className="ffm-category-content"><span className="ffm-category-number">0{i+1}</span><h3>{card.title}</h3>{card.subtitle&&<p>{card.subtitle}</p>}</div>
              <ArrowUpRight className="ffm-category-arrow" size={20} aria-hidden="true"/>
            </SafeLink>)}
          </div>
        ):actualCategories.length?(
          <div className="ffm-category-grid">
            {actualCategories.slice(0,8).map((category,i)=><Link key={category.id} to="/loja" search={{marca:category.slug}} className="ffm-category-card">
              <div className="ffm-category-art">{category.logo_url?<img src={category.logo_url} alt="" loading="lazy"/>:<span className="ffm-category-monogram">{category.name.slice(0,2)}</span>}</div>
              <div className="ffm-category-content"><span className="ffm-category-number">0{i+1}</span><h3>{category.name}</h3>{category.tagline&&<p>{category.tagline}</p>}</div>
              <ArrowUpRight className="ffm-category-arrow" size={20} aria-hidden="true"/>
            </Link>)}
          </div>
        ):(
          <div className="ffm-empty-categories"><Sparkles size={32} aria-hidden="true"/><div><h3>Novas coleções em preparação</h3><p>As categorias aparecerão aqui quando houver produtos cadastrados.</p></div></div>
        )}
      </section>

      <section id="destaques" className="ffm-section ffm-products">
        <div className="ffm-section-heading">
          <div><p className="ffm-kicker">CATÁLOGO CRAZY · 02</p><h2>Em <span>alta.</span></h2><p>Confira os produtos disponíveis na loja.</p></div>
          <Link to="/loja" search={{}} className="ffm-text-link">Ver tudo <ArrowUpRight size={18}/></Link>
        </div>
        {productsPending?(
          <div className="ffm-product-grid">{Array.from({length:4},(_,i)=><div key={i} className="aspect-[3/4] animate-pulse rounded-3xl bg-card"/>)}</div>
        ):products.length?(
          <div className="ffm-product-grid">{products.slice(0,8).map((p,i)=><ProductCard key={p.id} product={p} brand={brandName(p.category_id)} index={i}/>)}</div>
        ):(
          <div className="ffm-empty-products"><ShoppingBag size={36} aria-hidden="true"/><h3>O próximo destaque está chegando.</h3><p>Os produtos aparecerão aqui assim que forem cadastrados.</p><Link to="/loja" search={{}} className="ffm-text-link">Visitar a loja <ArrowRight size={18}/></Link></div>
        )}
      </section>

      <section className="ffm-benefits ffm-section" aria-label="Sua experiência de compra">
        <div className="ffm-benefit"><div className="ffm-benefit-icon"><Zap size={24} aria-hidden="true"/></div><div><h3>Compra descomplicada</h3><p>Encontre, escolha e finalize seu pedido.</p></div></div>
        <div className="ffm-benefit"><div className="ffm-benefit-icon"><Truck size={24} aria-hidden="true"/></div><div><h3>Entrega acompanhada</h3><p>Confira o andamento pelo site.</p></div></div>
        <div className="ffm-benefit"><div className="ffm-benefit-icon"><ShieldCheck size={24} aria-hidden="true"/></div><div><h3>Minha conta</h3><p>Seus dados e pedidos em um só lugar.</p></div></div>
      </section>

      <section className="ffm-final ffm-section">
        <div><p className="ffm-kicker">CRAZY PODS · {experience.label.toUpperCase()}</p><h2>Seu estilo. <span>Sua escolha.</span></h2><p>Uma loja diferente do primeiro clique à próxima descoberta.</p></div>
        <Link to="/loja" search={{}} className="ffm-button ffm-button-primary">Explorar a loja <ArrowRight size={19}/></Link>
      </section>
    </div>
  );
}
