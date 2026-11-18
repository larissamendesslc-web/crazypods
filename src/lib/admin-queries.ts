import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AdminProduct = Database["public"]["Tables"]["products"]["Row"];
export type CashEntry = Database["public"]["Tables"]["cash_entries"]["Row"];

export const adminProductsQuery = queryOptions({
  queryKey: ["admin", "products"],
  queryFn: async () => {
    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});
export const adminCategoriesQuery = queryOptions({
  queryKey: ["admin", "categories"],
  queryFn: async () => {
    const { data, error } = await supabase.from("categories").select("*").order("sort_order");
    if (error) throw error;
    return data;
  },
});
export const adminOrdersQuery = queryOptions({
  queryKey: ["admin", "orders"],
  refetchInterval: 10000,
  queryFn: async () => {
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) throw error;
    return data;
  },
});
export const cashQuery = queryOptions({
  queryKey: ["admin", "cash"],
  refetchInterval: 10000,
  queryFn: async () => {
    const { data, error } = await supabase.from("cash_entries").select("*").order("occurred_at", { ascending: false }).limit(1000);
    if (error) throw error;
    return data;
  },
});