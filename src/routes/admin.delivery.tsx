import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { MapPin, Save, Truck } from "lucide-react";
import { toast } from "sonner";
import { deliverySettingsQuery } from "@/lib/queries";
import { deliverySettingsSchema } from "@/lib/delivery";
import { saveDeliverySettings } from "@/utils/delivery.functions";
import { PageTitle } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StorePostalFields } from "@/components/admin/StorePostalFields";

export const Route = createFileRoute("/admin/delivery")({
  head: () => ({ meta: [
    { title: "Delivery — Painel Crazy" }, { name: "description", content: "Configure frete por distância, área de entrega e prazo na Crazy." },
    { property: "og:title", content: "Delivery — Painel Crazy" }, { property: "og:description", content: "Configurações de entrega da Crazy." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" },
  ] }), component: DeliveryAdmin,
});

function DeliveryAdmin() {
  const { data: settings, isPending, error } = useQuery(deliverySettingsQuery);
  const qc = useQueryClient();
  const saveFn = useServerFn(saveDeliverySettings);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ enabled: false, origin_zip: "", second_origin_zip: "", origin_whatsapp: "", second_origin_whatsapp: "", base_fee: "", per_km: "", max_km: "", preparation_minutes: "" });
  useEffect(() => {
    if (settings) setForm({ enabled: settings.enabled, origin_zip: settings.origin_zip ?? "", second_origin_zip: settings.second_origin_zip ?? "", origin_whatsapp: settings.origin_whatsapp ?? "", second_origin_whatsapp: settings.second_origin_whatsapp ?? "", base_fee: String(settings.base_fee), per_km: String(settings.per_km), max_km: String(settings.max_km), preparation_minutes: String(settings.preparation_minutes) });
  }, [settings]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = deliverySettingsSchema.safeParse({ ...form, base_fee: Number(form.base_fee.replace(",", ".")), per_km: Number(form.per_km.replace(",", ".")), max_km: Number(form.max_km.replace(",", ".")), preparation_minutes: Number(form.preparation_minutes) });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Confira os valores"); return; }
    setBusy(true);
    try { await saveFn({ data: parsed.data }); await qc.invalidateQueries({ queryKey: ["delivery-settings"] }); toast.success("Configurações de delivery salvas"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar"); }
    finally { setBusy(false); }
  };
  return <>
    <PageTitle title="Delivery" />
    {error ? <p className="text-destructive">Não foi possível carregar as configurações.</p> : isPending ? <p className="text-muted-foreground">Carregando...</p> :
    <form onSubmit={save} className="max-w-3xl space-y-7">
      <div className="flex items-center justify-between border-y py-5"><Label htmlFor="delivery-enabled" className="flex items-center gap-3 text-base"><Truck className="text-primary" /> Delivery ativo</Label><Switch id="delivery-enabled" checked={form.enabled} onCheckedChange={(enabled) => setForm({ ...form, enabled })} /></div>
      <section className="space-y-4"><h2 className="flex items-center gap-2 font-display font-bold"><MapPin className="h-5 w-5 text-accent" /> Lojas</h2>{([1, 2] as const).map((store) => <StorePostalFields key={store} store={store} zip={store === 1 ? form.origin_zip : form.second_origin_zip} whatsapp={store === 1 ? form.origin_whatsapp : form.second_origin_whatsapp} onChange={(field, value) => setForm((current) => ({ ...current, [store === 1 ? `origin_${field}` : `second_origin_${field}`]: value }))} />)}</section>
      <section className="space-y-4 border-t pt-6"><h2 className="font-display font-bold">Taxas e prazo</h2><div className="grid gap-5 sm:grid-cols-2">{([
        ["base_fee", "Taxa base (R$)", "0.01"], ["per_km", "Valor por km (R$)", "0.01"], ["max_km", "Distância máxima (km)", "0.01"], ["preparation_minutes", "Tempo de preparo (minutos)", "1"],
      ] as const).map(([key, label, step]) => <div key={key} className="space-y-2"><Label htmlFor={`delivery-${key}`}>{label}</Label><Input id={`delivery-${key}`} type="number" min={key === "max_km" ? "0.01" : "0"} max={key === "max_km" ? 500 : key === "preparation_minutes" ? 1440 : key === "per_km" ? 1000 : 10000} step={step} required value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></div>)}</div></section>
      <Button variant="neon" size="lg" type="submit" disabled={busy}><Save className="h-4 w-4" /> {busy ? "Salvando..." : "Salvar delivery"}</Button>
    </form>}
  </>;
}