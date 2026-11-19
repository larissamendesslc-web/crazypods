import { describe, expect, it } from "vitest";
import { defaultHome } from "@/lib/home-design";
import { STORE_THEMES } from "./theme-experience";
import { resolveThemeCopy, resolveThemeVariant, type HomeThemeVariant } from "./theme-variants";

describe("Editor de campanhas independentes", () => {
  const home = {...defaultHome,title:"Sinta o próximo",highlight:"nível da Crazy.",subtitle:"Texto da campanha Black."};
  it("Christmas and New Year do not inherit the Smoke headline", () => {
    expect(resolveThemeCopy("natal",home,null).title).toBe(STORE_THEMES.natal.title);
    expect(resolveThemeCopy("ano-novo",home,null).title).toBe(STORE_THEMES["ano-novo"].title);
    expect(resolveThemeCopy("natal",home,null).title).not.toBe(home.title);
  });
  it("keeps the original customized Smoke content", () => {
    expect(resolveThemeCopy("smoke",home,null).title).toBe(home.title);
    expect(resolveThemeCopy("smoke",home,null).subtitle).toBe(home.subtitle);
  });
  it("allows distinct text and background overrides for one theme", () => {
    const christmas = {
      theme:"natal",
      title:"Natal Crazy personalizado",
      subtitle:"Celebre com a loja",
      background_url:"https://example.com/natal.webp",
      highlight:null,
      eyebrow:null,
      updated_at:"",
    } satisfies HomeThemeVariant;
    const result=resolveThemeCopy("natal",home,christmas);
    expect(result.title).toBe("Natal Crazy personalizado");
    expect(result.highlight).toBe(STORE_THEMES.natal.highlight);
    expect(result.backgroundUrl).toBe(christmas.background_url);
    expect(resolveThemeCopy("ano-novo",home,null).title).toBe(STORE_THEMES["ano-novo"].title);
  });
  it("selects the correct theme record", () => {
    const christmas = {theme:"natal",title:"Especial Natal"} as HomeThemeVariant;
    expect(resolveThemeVariant("natal",[christmas])?.title).toBe("Especial Natal");
    expect(resolveThemeVariant("ano-novo",[christmas])).toBeNull();
  });
});