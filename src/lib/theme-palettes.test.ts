import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(new URL("../styles/theme-palettes.css", import.meta.url), "utf8");

function themeBlock(theme: string): string {
  const key = `:root[data-theme="${theme}"] {`;
  const start = stylesheet.indexOf(key);
  if (start === -1) throw new Error(`Paleta ausente: ${theme}`);
  const end = stylesheet.indexOf("\n}", start);
  if (end === -1) throw new Error(`Bloco incompleto: ${theme}`);
  return stylesheet.slice(start, end);
}
function hex(theme: string, token: string): string {
  const found = themeBlock(theme).match(new RegExp(`--cp-${token}:\\s*(#[a-fA-F0-9]{6})`));
  if (!found?.[1]) throw new Error(`Cor ausente: ${theme} / ${token}`);
  return found[1];
}
function luminance(color: string): number {
  const channels = [1, 3, 5].map(pos => {
    const code = Number.parseInt(color.slice(pos, pos + 2), 16) / 255;
    return code <= .04045 ? code / 12.92 : Math.pow((code + .055) / 1.055, 2.4);
  });
  return .2126 * channels[0]! + .7152 * channels[1]! + .0722 * channels[2]!;
}
function contrast(a: string, b: string): number {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

describe("Crazy Pods visual themes", () => {
  const themes = ["padrao", "premium", "natal", "ano-novo", "halloween"] as const;
  it.each(themes)("%s defines accessible text and call-to-action colors", theme => {
    expect(contrast(hex(theme, "bg"), hex(theme, "ink"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hex(theme, "key"), hex(theme, "key-ink"))).toBeGreaterThanOrEqual(4.5);
  });
  it("uses selected theme variables across the Home and site navigation", () => {
    for (const selector of [
      ".crazy-premium-home", ".crazy-hero-vignette",
      ".crazy-showcase-main", ".crazy-float-card",
      ".crazy-editorial-card", ".crazy-promise-strip",
      ".crazy-site-nav-bg", ".crazy-top-ticker", ".crazy-site-footer",
      ".crazy-cta-primary", ".crazy-editor-preview",
    ]) {
      expect(stylesheet).toContain(selector);
    }
  });
  it("tints example SVGs without recoloring uploaded illustrations", () => {
    expect(stylesheet).toContain(".crazy-showcase-cutout.crazy-demo-illustration");
    expect(stylesheet).toContain(".crazy-hero-backdrop.crazy-demo-scene");
  });
  it("preserves the nativity of light and dark UI controls", () => {
    expect(stylesheet).toContain(':root[data-theme="natal"] { color-scheme: light; }');
    expect(stylesheet).toContain('color-scheme: dark');
  });
});
