import { describe, expect, it } from "vitest";
import { defaultHome, validHomeLink } from "./home-design";

describe("Crazy Pods visual editor", () => {
  it("keeps marketing artwork separate from catalog products", () => {
    expect(defaultHome.center_image_url).toBeNull();
    expect(defaultHome.left_image_url).toBeNull();
    expect(defaultHome.right_image_url).toBeNull();
    expect(defaultHome.background_url).toBeNull();
  });
  it("accepts only internal CTA destinations", () => {
    expect(validHomeLink("/loja")).toBe(true);
    expect(validHomeLink("/loja?marca=fones")).toBe(true);
    expect(validHomeLink("#destaques")).toBe(true);
    expect(validHomeLink("https://external.example")).toBe(false);
    expect(validHomeLink("//external.example")).toBe(false);
    expect(validHomeLink("javascript:alert(1)")).toBe(false);
    expect(validHomeLink("/\\evil.com")).toBe(false);
  });
});
