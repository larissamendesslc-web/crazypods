import { queryOptions } from "@tanstack/react-query";
import { homeDb, defaultHome, type HomeDesign } from "@/lib/home-design";
import { normalizeStoreTheme, themeExperience, themedDefault, type StoreTheme } from "@/lib/theme-experience";

export type HomeThemeVariant = {
  theme: StoreTheme;
  eyebrow: string | null;
  title: string | null;
  highlight: string | null;
  subtitle: string | null;
  background_url: string | null;
  updated_at: string;
};

export const homeThemeVariantsQuery = queryOptions({
  queryKey: ["home", "variants"],
  queryFn: async (): Promise<HomeThemeVariant[]> => {
    const { data, error } = await homeDb.from("home_theme_variants").select("*").order("theme");
    if (error) throw error;
    return (data ?? []) as HomeThemeVariant[];
  },
  staleTime: 30_000,
  refetchInterval: 20_000,
});

export function resolveThemeVariant(theme: string | null | undefined, rows: HomeThemeVariant[]): HomeThemeVariant | null {
  const current = normalizeStoreTheme(theme);
  return rows.find(row => row.theme === current) ?? null;
}

export function resolveThemeCopy(theme: string | null | undefined, home: HomeDesign, variant: HomeThemeVariant | null) {
  const current = normalizeStoreTheme(theme);
  const experience = themeExperience(current);
  // Existing custom homepage copy belongs to the core Crazy editions.
  // Holiday campaigns have dedicated defaults; admin can override each separately.
  const useSharedCopy = current === "smoke" || current === "premium" || current === "padrao";
  const copy = (key: "eyebrow" | "title" | "highlight" | "subtitle") => {
    const custom = variant?.[key]?.trim();
    if (custom) return custom;
    return useSharedCopy ? themedDefault(defaultHome[key], home[key], experience[key]) : experience[key];
  };
  return {
    eyebrow: copy("eyebrow"),
    title: copy("title"),
    highlight: copy("highlight"),
    subtitle: copy("subtitle"),
    backgroundUrl: variant?.background_url || home.background_url,
  };
}
