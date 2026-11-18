import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Product = Omit<Database["public"]["Tables"]["products"]["Row"], "cost"> & { cost?: number };
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type Settings = Database["public"]["Tables"]["site_settings"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export const deliveryAvailabilityQuery = queryOptions({
  queryKey: ["delivery-availability"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("get_delivery_availability");
    if (error) throw error;
    return data?.[0] ?? null;
  },
  staleTime: 30_000,
});

export const deliverySettingsQuery = queryOptions({
  queryKey: ["delivery-settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("delivery_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    return data;
  },
  staleTime: 30_000,
});

export const PUBLIC_PRODUCT_COLS =
  "id, category_id, name, description, price, compare_price, stock, flavors, puffs, image_url, accent_color, featured, active, created_at, updated_at";

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    return data as Settings | null;
  },
  staleTime: 60_000,
});

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => {
    const { data, error } = await supabase.from("categories").select("*").eq("active", true).order("sort_order");
    if (error) throw error;
    return data as Category[];
  },
  staleTime: 60_000,
});

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("products")
      .select(PUBLIC_PRODUCT_COLS)
      .eq("active", true)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Product[];
  },
  staleTime: 30_000,
});

export const productQuery = (id: string) =>
  queryOptions({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select(PUBLIC_PRODUCT_COLS).eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Product | null;
    },
  });