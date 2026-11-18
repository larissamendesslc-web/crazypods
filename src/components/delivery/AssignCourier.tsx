import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { couriersQuery } from "@/lib/tracking-queries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
export function AssignCourier({ orderId, current }: { orderId: string; current?: string | undefined }) {
  const couriers = useQuery(couriersQuery); const qc = useQueryClient(); const [busy, setBusy] = useState(false);
  return <div className="mt-3 max-w-xs"><Select value={current ?? ""} disabled={busy} onValueChange={async (courierId) => { setBusy(true); const { error } = await supabase.rpc("assign_order_courier", { _order_id: orderId, _courier_id: courierId }); if (error) toast.error(error.message); else { toast.success("Motoboy atribuído"); await qc.invalidateQueries({ queryKey: ["deliveries"] }); } setBusy(false); }}><SelectTrigger aria-label="Motoboy do pedido"><SelectValue placeholder="Atribuir motoboy" /></SelectTrigger><SelectContent>{couriers.data?.filter((c) => c.active).map((c) => <SelectItem key={c.user_id} value={c.user_id}>{c.name}</SelectItem>)}</SelectContent></Select>{couriers.data?.filter((c) => c.active).length === 0 && <p className="mt-2 text-xs text-muted-foreground">Nenhum motoboy ativo.</p>}</div>;
}