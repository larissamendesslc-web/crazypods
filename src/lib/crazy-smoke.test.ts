import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defaultHome } from "./home-design";

const css = readFileSync(resolve(process.cwd(), "src/styles/crazy-smoke.css"), "utf8");

describe("Crazy Smoke Black Edition", () => {
  it("keeps the homepage marketing settings independent of catalog products", () => {
    expect(defaultHome.smoke_enabled).toBe(true);
    expect(defaultHome.smoke_intensity).toBe(60);
    expect(defaultHome.hero_art_scale).toBe(95);
    expect(defaultHome.show_side_art).toBe(false);
    expect(defaultHome.motion_preset).toBe("cinematic");
  });
  it("includes every color token used by the premium homepage and store chrome", () => {
    for (const token of ["--cp-bg:","--cp-ink:","--cp-muted:","--cp-key:","--cp-key-ink:","--cp-panel:","--cp-nav-bg:","--cp-accent-rgb:"]) {
      expect(css).toContain(token);
    }
  });
  it("uses separate smoke motion settings and respects reduced-motion users", () => {
    expect(css).toContain('.crazy-smoke-fx[data-motion="off"]');
    expect(css).toContain('.crazy-smoke-fx[data-motion="subtle"]');
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain('.crazy-smoke-fx[data-visible="no"]');
  });
  it("supports mobile without rendering the third smoke layer", () => {
    expect(css).toContain("@media (max-width: 720px)");
    expect(css).toContain(".crazy-smoke-stream-three { display:none; }");
    expect(css).toContain("object-fit:contain");
  });
});
