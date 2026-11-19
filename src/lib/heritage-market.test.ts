import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const code = readFileSync(resolve(process.cwd(), "src/routes/index.tsx"), "utf8");
const css = readFileSync(resolve(process.cwd(), "src/styles/heritage-market.css"), "utf8");
const root = readFileSync(resolve(process.cwd(), "src/routes/__root.tsx"), "utf8");
const header = readFileSync(resolve(process.cwd(), "src/components/site/Header.tsx"), "utf8");
const footer = readFileSync(resolve(process.cwd(), "src/components/site/Footer.tsx"), "utf8");

describe("Flavor Flock Market visual heritage", () => {
  it("brings back the original Lovable section hierarchy without fake inventory", () => {
    for(const id of ["ffm-hero","ffm-marquee","id=\"marcas\"","id=\"destaques\"","ffm-products","ffm-benefits"]) {
      expect(code).toContain(id);
    }
    expect(code).toContain("productsQuery");
    expect(code).toContain("categoriesQuery");
    expect(code).toContain("ProductCard");
    expect(code).toContain("homeFeatureCardsQuery");
  });
  it("preserves customization and theme-aware artwork", () => {
    for(const part of ["homeDesignQuery","homeThemeVariantsQuery","resolveThemeCopy","resolveThemeVariant","SmokeFX","home.center_image_url","home.left_image_url","home.right_image_url"]) expect(code).toContain(part);
    for(const theme of ["smoke","padrao","premium","natal","ano-novo","halloween"]) {
      expect(css).toContain('data-theme="'+theme+'"');
    }
  });
  it("loads the visual system after existing seasonal CSS, without changing checkout", () => {
    expect(root.indexOf("href: heritageMarketCss")).toBeGreaterThan(root.indexOf("href: seasonalExperienceCss"));
    expect(root).toContain("CartDrawer");
    expect(root).toContain("FloatingCart");
    expect(root).toContain("PaymentTestModeBanner");
  });
  it("keeps functional search, cart, account and all original in-page links", () => {
    expect(header).toContain('onSubmit={submitSearch}');
    expect(header).toContain('cart.setOpen(true)');
    expect(header).toContain('to="/conta"');
    expect(header).toContain('to="/" hash="marcas"');
    expect(header).toContain('to="/conta">Meus pedidos');
    expect(footer).toContain('to="/loja"');
  });
  it("respects reduced motion", () => {
    expect(css).toContain("@media(prefers-reduced-motion:reduce)");
  });
});
