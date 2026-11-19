import { useEffect, useRef, useState, type CSSProperties } from "react";

export type SmokeMotion = "off" | "subtle" | "cinematic";
export type SmokeSettings = {
  enabled: boolean;
  intensity: number;
  motion: SmokeMotion;
};

/**
 * Ambient smoke uses a small SVG texture moved through CSS transforms.
 * IntersectionObserver pauses the animation when the Home is outside the viewport;
 * reduced-motion users always receive a static atmosphere.
 */
export function SmokeFX({ enabled, intensity, motion }: SmokeSettings) {
  const node = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = node.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)), { rootMargin: "150px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!enabled || intensity <= 0) return null;
  const opacity = Math.min(1, Math.max(0, intensity / 100));
  const style = { "--smoke-opacity": opacity } as CSSProperties;

  return (
    <div
      ref={node}
      aria-hidden="true"
      className="crazy-smoke-fx"
      data-motion={motion}
      data-visible={visible ? "yes" : "no"}
      style={style}
    >
      <span className="crazy-smoke-stream crazy-smoke-stream-one" />
      <span className="crazy-smoke-stream crazy-smoke-stream-two" />
      <span className="crazy-smoke-stream crazy-smoke-stream-three" />
      <span className="crazy-smoke-ember crazy-smoke-ember-one" />
      <span className="crazy-smoke-ember crazy-smoke-ember-two" />
    </div>
  );
}
