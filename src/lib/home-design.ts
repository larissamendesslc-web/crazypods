import { queryOptions } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Homepage content only; the marketing artwork never creates catalog products. */
export type HomeDesign = {
  id: number;
  eyebrow: string;
  title: string;
  highlight: string;
  subtitle: string;
  primary_label: string;
  primary_link: string;
  secondary_label: string;
  secondary_link: string;
  background_url: string | null;
  center_image_url: string | null;
  left_image_url: string | null;
  right_image_url: string | null;
  center_caption: string;
  left_caption: string;
  right_caption: string;
  smoke_enabled: boolean;
  smoke_intensity: number;
  motion_preset: "off" | "subtle" | "cinematic";
  show_side_art: boolean;
  hero_art_scale: number;
  updated_at: string;
};
export type HomeFeatureCard = {
  slot: number;
  title: string;
  subtitle: string;
  image_url: string | null;
  target_link: string;
  active: boolean;
  updated_at: string;
};

export const defaultHome: HomeDesign = {
  id: 1,
  eyebrow: "UMA NOVA EXPERIÊNCIA CRAZY PODS",
  title: "O extraordinário",
  highlight: "do seu jeito.",
  subtitle: "Conheça nossa vitrine e descubra o que combina com você. Tudo com a identidade Crazy Pods.",
  primary_label: "Explorar a loja",
  primary_link: "/loja",
  secondary_label: "Ver destaques",
  secondary_link: "#destaques",
  background_url: null,
  center_image_url: null,
  left_image_url: null,
  right_image_url: null,
  center_caption: "Vitrine Crazy",
  left_caption: "Seu estilo",
  right_caption: "Seu próximo favorito",
  smoke_enabled: true,
  smoke_intensity: 60,
  motion_preset: "cinematic",
  show_side_art: false,
  hero_art_scale: 95,
  updated_at: "",
};

// Reuse the logged-in Supabase client: RLS protects admin edits, public reads stay safe.
// The new schema is intentionally separate from the generated legacy product tables.
export const homeDb = supabase as unknown as SupabaseClient;
export const homeDesignQuery = queryOptions({
  queryKey: ["home", "design"],
  queryFn: async (): Promise<HomeDesign> => {
    const { data, error } = await homeDb.from("home_design").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    return data ? data as HomeDesign : defaultHome;
  },
  staleTime: 30_000,
});
export const homeFeatureCardsQuery = queryOptions({
  queryKey: ["home", "cards"],
  queryFn: async (): Promise<HomeFeatureCard[]> => {
    const { data, error } = await homeDb.from("home_feature_cards").select("*").order("slot");
    if (error) throw error;
    return (data ?? []) as HomeFeatureCard[];
  },
  staleTime: 30_000,
});

export function validHomeLink(raw: string): boolean {
  const value = raw.trim();
  return (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !value.includes(":"))
    || /^#[a-zA-Z][a-zA-Z0-9_-]*$/.test(value);
}
