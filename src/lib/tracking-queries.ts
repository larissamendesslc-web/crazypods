import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
export const couriersQuery = queryOptions({ queryKey: ["admin", "couriers"], queryFn: async () => {
  const { data, error } = await supabase.from("couriers").select("*").order("name"); if (error) throw error; return data;
}});
export const deliveriesQuery = queryOptions({ queryKey: ["deliveries"], queryFn: async () => {
  const { data, error } = await supabase.from("order_deliveries").select("*").order("assigned_at", { ascending: false }).limit(500); if (error) throw error; return data;
}, refetchInterval: 15_000 });
export const deliveryQuery = (orderId: string) => queryOptions({ queryKey: ["delivery", orderId], queryFn: async () => {
  const { data, error } = await supabase.from("order_deliveries").select("*").eq("order_id", orderId).maybeSingle(); if (error) throw error; return data;
}, refetchInterval: 10_000 });