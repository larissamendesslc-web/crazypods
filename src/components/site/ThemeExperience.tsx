import { ArrowRight, Gift, MoonStar, Sparkles, SunMedium, Truck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { themeExperience, normalizeStoreTheme } from "@/lib/theme-experience";

export function ThemePageRibbon({ theme }: { theme: string }) {
  const id = normalizeStoreTheme(theme ?? "padrao");
  const experience = themeExperience(id);
  if (id !== "natal" && id !== "ano-novo" && id !== "halloween") return null;
  return (
    <div className="crazy-page-ribbon" role="note" data-ribbon-theme={id}>
      {id === "natal" ? <Gift size={15} aria-hidden="true" /> : id === "ano-novo" ? <Sparkles size={15} aria-hidden="true" /> : <MoonStar size={15} aria-hidden="true" />}
      <span>{experience.ribbon}</span>
      <span className="crazy-page-ribbon-divider" aria-hidden="true">✦</span>
      <span className="crazy-page-ribbon-small">{experience.deliveryMessage}</span>
    </div>
  );
}

export function ThemeShopCover({ theme }: { theme: string }) {
  const experience = themeExperience(theme);
  const id = normalizeStoreTheme(theme);
  const image = experience.art;
  return (
    <section className={`crazy-shop-cover crazy-shop-cover-${id}`} aria-label={experience.label}>
      <div className="crazy-shop-cover-lights" aria-hidden="true" />
      <div className="crazy-shop-cover-copy">
        <div className="crazy-shop-cover-eyebrow">
          {id === "natal" ? <Gift size={15} /> : id === "ano-novo" ? <SunMedium size={15} /> : <Sparkles size={15} />}
          <span>{experience.eyebrow}</span>
        </div>
        <h2>{experience.title} <strong>{experience.highlight}</strong></h2>
        <p>{experience.subtitle}</p>
        <div className="crazy-shop-cover-promises">
          <span><Truck size={15} /> Pedidos acompanhados</span>
          <span><Sparkles size={15} /> Vitrine Crazy</span>
        </div>
      </div>
      <div className="crazy-shop-cover-art" aria-hidden="true">
        {image ? <img src={image} alt="" loading="lazy" width={1000} height={950} /> : (
          <div className="crazy-shop-orbit"><Sparkles size={64}/><span>CRAZY PODS</span></div>
        )}
      </div>
    </section>
  );
}
