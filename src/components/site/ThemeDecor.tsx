import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/queries";

export function useThemeSync() {
  const { data } = useQuery(settingsQuery);
  const theme = data?.theme ?? "padrao";
  useEffect(() => {
    document.documentElement.dataset["theme"] = theme;
  }, [theme]);
  return theme;
}

export function ThemeDecor({ theme }: { theme: string }) {
  const parts = useMemo(
    () => Array.from({ length: 22 }, (_, i) => ({
      left: (i * 37) % 100, delay: (i * 1.3) % 12, dur: 9 + ((i * 7) % 9), size: 10 + ((i * 5) % 14), top: (i * 23) % 90,
    })),
    [],
  );
  if (theme === "padrao" || theme === "smoke") return null;
  return (
    <div aria-hidden className={`pointer-events-none fixed inset-0 z-40 overflow-hidden ${theme === "natal" ? "winter-snow" : ""}`}>
      {theme === "natal" && parts.slice(0, 14).map((p, i) => (
        <span key={i} className="decor-particle" style={{ left: `${i % 2 === 0 ? p.left % 18 : 82 + p.left % 18}%`, animationDelay: `${-p.delay}s`, animationDuration: `${p.dur + 8}s`, fontSize: 8 + p.size / 3 }}>❄</span>
      ))}
      {theme === "ano-novo" && parts.map((p, i) => (
        <span key={i} className="decor-spark" style={{ left: `${p.left}%`, top: `${p.top}%`, animationDelay: `${p.delay / 3}s`, animationDuration: `${2 + (p.dur % 4)}s`, fontSize: p.size }}>✦</span>
      ))}
      {theme === "halloween" && parts.slice(0, 9).map((p, i) => (
        <span key={i} className="decor-bat opacity-60" style={{ left: `${p.left}%`, top: `${p.top}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, fontSize: p.size + 6 }}>🦇</span>
      ))}
    </div>
  );
}

export const THEMES = [
  { id: "smoke", name: "Crazy Smoke · Black Edition", desc: "Preto intenso, fumaça animada e neon laranja", colors: ["#08070c", "#ff811f", "#b774fb"] },
  { id: "premium", name: "Crazy Pods Premium", desc: "Laranja neon, violeta e preto", colors: ["#0b0811", "#ff851b", "#b96aff"] },
  { id: "padrao", name: "Crazy Neon", desc: "Preto, verde-limão e rosa neon em toda a Home", colors: ["#0b0f0b", "#cffc4d", "#ff5ddd"] },
  { id: "natal", name: "Natal", desc: "Home clara, vermelho, verde e neve", colors: ["#f8fbf8", "#b52036", "#16744b"] },
  { id: "ano-novo", name: "Ano Novo", desc: "Azul-noturno, dourado e brilhos", colors: ["#070d20", "#f0cb79", "#a4bbf3"] },
  { id: "halloween", name: "Halloween", desc: "Roxo, laranja e morcegos", colors: ["#12081b", "#ff881c", "#bd75fb"] },
] as const;