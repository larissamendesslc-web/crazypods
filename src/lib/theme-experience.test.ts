import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { STORE_THEMES, normalizeStoreTheme, themeExperience, themedDefault } from "./theme-experience";

describe("Crazy Pods: temas completos para a loja do cliente", () => {
  const themes = ["smoke", "natal", "ano-novo", "halloween", "premium", "padrao"] as const;
  it("supports all themes in the admin selector", () => {
    expect(Object.keys(STORE_THEMES).sort()).toEqual([...themes].sort());
  });
  it.each(themes)("%s renders its own visual identity and messaging", name => {
    const theme = themeExperience(name);
    expect(theme.label.length).toBeGreaterThan(6);
    expect(theme.title.trim()).toBeTruthy();
    expect(theme.highlight.trim()).toBeTruthy();
    expect(theme.eyebrow).toContain("CRAZY PODS");
    expect(theme.ribbon).toBeTruthy();
    expect(theme.productsKicker).toBeTruthy();
  });
  it("Christmas, New Year and Halloween each use different dedicated artwork", () => {
    const seasonal = [STORE_THEMES.natal.art, STORE_THEMES["ano-novo"].art, STORE_THEMES.halloween.art];
    expect(new Set(seasonal).size).toBe(3);
    for (const asset of seasonal) {
      expect(asset).toMatch(/^\/crazy-.+-stage\.svg$/);
      expect(readFileSync(resolve(process.cwd(), "public", asset!.slice(1)), "utf8")).toContain("<svg");
    }
  });
  it("honors admin-customized copy while applying the seasonal default", () => {
    expect(themedDefault("O extraordinário", "O extraordinário", "O Natal fica")).toBe("O Natal fica");
    expect(themedDefault("O extraordinário", "Minha campanha personalizada", "O Natal fica")).toBe("Minha campanha personalizada");
    expect(themedDefault("O extraordinário", null, "Vire o ano.")).toBe("Vire o ano.");
  });
  it("resolves unknown themes to the main Smoke edition", () => {
    expect(normalizeStoreTheme(null)).toBe("smoke");
    expect(normalizeStoreTheme("invalid")).toBe("smoke");
    expect(normalizeStoreTheme("natal")).toBe("natal");
  });
  it("has dedicated customer-facing seasonal styles after legacy ones", () => {
    const css = readFileSync(resolve(process.cwd(), "src/styles/seasonal-experience.css"), "utf8");
    for (const key of ['data-theme="natal"', 'data-theme="ano-novo"', '.crazy-season-stage',
      '.crazy-shop-cover', '.crazy-storefront-main', '.crazy-site-footer', '.store-product']) {
      expect(css).toContain(key);
    }
    expect(css).toContain("--background: #100b13;");
    expect(css).toContain("--background: #070c1c;");
  });
});
