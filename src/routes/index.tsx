import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCart } from "@/lib/cart";
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
  const destination = validHomeLink(href) ? href.trim() : "/loja";
  if (destination === "/loja") return <Link to="/loja" search={{}} className={className}>{children}</Link>;
  if (destination === "/conta") return <Link to="/conta" className={className}>{children}</Link>;
  if (destination === "#marcas" || destination === "/#marcas") return <Link to="/" hash="marcas" className={className}>{children}</Link>;
  if (destination === "#destaques" || destination === "/#destaques") return <Link to="/" hash="destaques" className={className}>{children}</Link>;
  if (destination === "#como-comprar" || destination === "/#como-comprar") return <Link to="/" hash="como-comprar" className={className}>{children}</Link>;
  return <a href={destination} className={className}>{children}</a>;
}

function Home() {
  const {data:settings,isPending:settingsPending}=useQuery(settingsQuery);
  const theme=normalizeStoreTheme(settings?.theme ?? "padrao");
  const cart=useCart();
  const routeHash=useRouterState({select:s=>s.location.hash});
  const experience=themeExperience(theme);
  const {data:stored,isPending:homePending}=useQuery(homeDesignQuery);
  const home=stored??defaultHome;
  const {data:variants=[],isPending:variantPending}=useQuery(homeThemeVariantsQuery);
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
  const isOpening= settingsPending || homePending || variantPending;
  // Category/highlight links must find their target even if the Home data arrives after navigation.
  useEffect(()=>{
    if (isOpening || !routeHash) return;
    const target=String(routeHash).replace(/^#/,"");
    if (!["marcas","destaques","como-comprar"].includes(target)) return;
    const frame=requestAnimationFrame(()=>document.getElementById(target)?.scrollIntoView({block:"start",behavior:"instant"}));
    return ()=>cancelAnimationFrame(frame);
  },[routeHash,isOpening]);

  return (
    <div className={["ffm-home","ffm-home-"+theme].join(" ")} data-heritage-home="true" data-experience={theme}>
      <section className="ffm-hero" aria-label="Bem-vindo à Crazy Pods">
        <div className="ffm-hero-aurora" aria-hidden="true" />
        {backgroundUrl&&<img className="ffm-hero-background" src={backgroundUrl} alt="" aria-hidden="true" fetchPriority="high"/>}
        {theme==="smoke"&&<SmokeFX enabled={home.smoke_enabled} intensity={home.smoke_intensity} motion={home.motion_preset}/>}
        <div className="ffm-hero-shell">
          <div className="ffm-hero-copy animate-rise">
            {isOpening ? <div className="ffm-opening-state" role="status" aria-live="polite">
              <span className="ffm-hero-eyebrow"><Sparkles size={15}/> CRAZY PODS</span>
              <h1 className="ffm-hero-title">Sua próxima <span>descoberta.</span></h1>
              <p className="ffm-hero-description">Preparando a experiência da loja...</p>
              <div className="ffm-opening-progress" aria-hidden="true"><span/></div>
            </div> : <>
            <span className="ffm-hero-eyebrow"><Sparkles size={15} aria-hidden="true"/>{copy.eyebrow}</span>
            <p className="ffm-hero-edition"><span className="ffm-neon-line"/> CRAZY PODS / ORIGINAL EXPERIENCE</p>
            <h1 className="ffm-hero-title">{mainTitle}<span>{highlight}</span></h1>
            <p className="ffm-hero-description">{copy.subtitle}</p>
            <div className="ffm-hero-actions">
              <SafeLink href={home.primary_link} className="ffm-button ffm-button-primary">{home.primary_label} <ArrowRight size={20} aria-hidden="true"/></SafeLink>
              <SafeLink href={home.secondary_link} className="ffm-button ffm-button-outline">{home.secondary_label} <ArrowUpRight size={19} aria-hidden="true"/></SafeLink>
            </div>
            <div className="ffm-hero-trust">
              <span><ShieldCheck size={17} aria-hidden="true"/> Compra com conta segura</span>
              <span><Truck size={17} aria-hidden="true"/> Pedidos acompanhados</span>
            </div>
            </>}
          </div>
          <div className="ffm-hero-display" style={{"--hero-art-scale":home.hero_art_scale/100} as CSSProperties} aria-label="Vitrine Crazy Pods">
            <div className="ffm-display-ring ffm-display-ring-one" aria-hidden="true"/>
            <div className="ffm-display-ring ffm-display-ring-two" aria-hidden="true"/>
            <div className="ffm-display-light" aria-hidden="true"/>
            {!isOpening && artImage?(
              <div className="ffm-display-product">
                <ProductStage src={artImage} alt={artAlt} accent={featured?.accent_color} size="lg" float className="ffm-display-product-stage h-full w-full"/>
                <span className="ffm-display-caption">{home.center_image_url?home.center_caption:featured?.name}</span>
              </div>
            ):!isOpening && themeStage?(
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

      <nav className="ffm-entry-links" aria-label="O que você quer fazer?">
        <Link to="/loja" search={{}} className="ffm-entry-link"><ShoppingBag size={21} aria-hidden="true"/><span><strong>Comprar agora</strong><small>Explorar os produtos</small></span><ArrowUpRight size={16}/></Link>
        <Link to="/" hash="marcas" className="ffm-entry-link"><Package size={21} aria-hidden="true"/><span><strong>Ver categorias</strong><small>Escolher por tipo</small></span><ArrowUpRight size={16}/></Link>
        <Link to="/conta" className="ffm-entry-link"><Truck size={21} aria-hidden="true"/><span><strong>Meus pedidos</strong><small>Acompanhar a compra</small></span><ArrowUpRight size={16}/></Link>
      </nav>
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
            {actualCategories.slice(0,8).map((category,i)=><Link key={category.id} to="/loja" search={{marca:category.slug}} hash="catalogo" className="ffm-category-card">
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

      <section id="como-comprar" className="ffm-section ffm-how-to-shop" aria-label="Como comprar">
        <div className="ffm-section-heading"><div><p className="ffm-kicker">SIMPLES DO INÍCIO AO FIM · 03</p><h2>Compre em <span>3 passos.</span></h2><p>Você escolhe, confirma e acompanha sem sair do site.</p></div></div>
        <div className="ffm-benefits">
          <Link to="/loja" search={{}} className="ffm-benefit ffm-benefit-action">
            <span className="ffm-benefit-step">01</span><div className="ffm-benefit-icon"><ShoppingBag size={24} aria-hidden="true"/></div><div><h3>Escolha seus produtos</h3><p>Veja o catálogo e adicione ao carrinho.</p></div><ArrowUpRight size={17} className="ffm-benefit-go"/>
          </Link>
          <button type="button" className="ffm-benefit ffm-benefit-action" onClick={()=>cart.setOpen(true)}>
            <span className="ffm-benefit-step">02</span><div className="ffm-benefit-icon"><ShieldCheck size={24} aria-hidden="true"/></div><div><h3>Revise seu carrinho</h3><p>Confira os itens e prossiga ao checkout.</p></div><ArrowUpRight size={17} className="ffm-benefit-go"/>
          </button>
          <Link to="/conta" className="ffm-benefit ffm-benefit-action">
            <span className="ffm-benefit-step">03</span><div className="ffm-benefit-icon"><Truck size={24} aria-hidden="true"/></div><div><h3>Acompanhe seu pedido</h3><p>Entre na conta e consulte o andamento.</p></div><ArrowUpRight size={17} className="ffm-benefit-go"/>
          </Link>
        </div>
      </section>

      <section className="ffm-final ffm-section">
        <div><p className="ffm-kicker">CRAZY PODS · {experience.label.toUpperCase()}</p><h2>Seu pedido. <span>Tudo no controle.</span></h2><p>Já comprou? Consulte seus pedidos e acompanhe cada atualização pela sua conta.</p></div>
        <Link to="/conta" className="ffm-button ffm-button-primary">Meus pedidos <ArrowRight size={19}/></Link>
      </section>
    </div>
  );
}
