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
  if (theme === "padrao") return null;
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
  { id: "premium", name: "Crazy Pods Premium", desc: "Laranja neon, roxo e preto · tema novo", colors: ["#0b0811", "#ff8017", "#b568fd"] },
  { id: "padrao", name: "Crazy Neon", desc: "Identidade original", colors: ["#07070a", "#c6ff3d", "#ff3df0"] },
  { id: "natal", name: "Natal", desc: "Branco, vermelho, verde e neve", colors: ["#ffffff", "#bb1730", "#164d38"] },
  { id: "ano-novo", name: "Ano Novo", desc: "Dourado e brilho", colors: ["#0b1024", "#f2c94c", "#e8edf7"] },
  { id: "halloween", name: "Halloween", desc: "Abóbora e roxo", colors: ["#170a20", "#ff8a1f", "#9b3dff"] },
] as const;