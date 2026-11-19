import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defaultHome, validHomeLink } from "./home-design";

const file = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const home = file("src/routes/index.tsx");
const header = file("src/components/site/Header.tsx");
const shop = file("src/routes/loja.tsx");
const checkout = file("src/routes/checkout.tsx");
const footer = file("src/components/site/Footer.tsx");
const css = file("src/styles/heritage-market.css");

describe("Jornada do cliente: entrada, produtos, carrinho, checkout e pedidos", () => {
  it("keeps the homepage CTA destinations valid and available", () => {
    expect(defaultHome.primary_link).toBe("/loja");
    expect(defaultHome.secondary_link).toBe("#destaques");
    expect(validHomeLink(defaultHome.primary_link)).toBe(true);
    expect(validHomeLink(defaultHome.secondary_link)).toBe(true);
    expect(home).toContain('to="/loja" search={{}}');
    expect(home).toContain('to="/conta"');
  });
  it("has distinct customer starting points and matching sections", () => {
    for (const id of ["marcas", "destaques", "como-comprar"]) {
      expect(home).toContain(`id="${id}"`);
    }
    expect(home).toContain('aria-label="O que você quer fazer?"');
    expect(home).toContain("cart.setOpen(true)");
    expect(home).toContain("isOpening");
    expect(home).toContain("ffm-opening-progress");
  });
  it("keeps route and section links consistent across header and footer", () => {
    expect(header).toContain('to="/" hash="marcas"');
    expect(header).toContain('to="/conta"');
    expect(header).toContain('hash:"catalogo"');
    expect(footer).toContain('hash="marcas"');
    expect(footer).toContain('hash="como-comprar"');
  });
  it("takes category and search entries directly to relevant filtered products", () => {
    expect(home).toContain('hash="catalogo" className="ffm-category-card"');
    expect(shop).toContain('id="catalogo"');
    expect(shop).toContain("availableCategories");
    expect(shop).toContain("unavailableCategory");
    expect(shop).toContain('hash="catalogo"');
  });
  it("gives shoppers a way back from checkout without changing payment logic", () => {
    expect(checkout).toContain('aria-label="Etapas da compra"');
    expect(checkout).toContain('to="/loja"');
    expect(checkout).toContain('supabase.rpc("place_order"');
    expect(checkout).toContain('paymentAvailability');
  });
  it("preserves mobile spacing, anchored scroll and original RGB appearance", () => {
    expect(css).toContain(".ffm-entry-links");
    expect(css).toContain(".ffm-breadcrumbs");
    expect(css).toContain(".ffm-benefit-action");
    expect(css).toContain("scroll-margin-top");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("Customer journey");
  });
});
