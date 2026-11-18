import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin, Truck } from "lucide-react";
import { deliveryAvailabilityQuery } from "@/lib/queries";
import { cepSchema, destinationSchema, type DeliveryQuote } from "@/lib/delivery";
import { lookupDeliveryCep, quoteDelivery } from "@/utils/delivery.functions";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeliveryAddress({ onQuote }: { onQuote: (quote: DeliveryQuote | null) => void }) {
  const { data: settings, isPending, error: settingsError } = useQuery(deliveryAvailabilityQuery);
  const lookup = useServerFn(lookupDeliveryCep);
  const calculate = useServerFn(quoteDelivery);
  const [zip, setZip] = useState("");
  const [address, setAddress] = useState({ street: "", number: "", complement: "", neighborhood: "", city: "", state: "" });
  const [found, setFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [retry, setRetry] = useState(0);
  const revision = useRef(0);
  const callback = useRef(onQuote);
  callback.current = onQuote;
  useEffect(() => {
    const parsed = cepSchema.safeParse(zip);
    if (!parsed.success) return;
    const version = ++revision.current;
    const timer = setTimeout(async () => {
      setBusy(true); setError("");
      try {
        const result = await lookup({ data: { zip: parsed.data } });
        if (version !== revision.current) return;
        if ("error" in result) throw new Error(result.error);
        setAddress({ ...result, number: "", complement: "" }); setFound(true);
      } catch (e) { if (version === revision.current) setError(e instanceof Error ? e.message : "CEP não encontrado"); }
      finally { if (version === revision.current) setBusy(false); }
    }, 500);
    return () => { clearTimeout(timer); revision.current++; };
  }, [zip, lookup, retry]);
  useEffect(() => {
    callback.current(null); setQuote(null);
    if (!found || !settings?.enabled) return;
    const parsed = destinationSchema.safeParse({ zip, ...address });
    if (!parsed.success) return;
    const version = ++revision.current;
    const timer = setTimeout(async () => {
      setBusy(true); setError("");
      try {
        const result = await calculate({ data: parsed.data });
        if (version !== revision.current) return;
        setQuote(result); callback.current(result);
      } catch (e) { if (version === revision.current) setError(e instanceof Error ? e.message : "Não foi possível calcular o frete"); }
      finally { if (version === revision.current) setBusy(false); }
    }, 800);
    return () => { clearTimeout(timer); revision.current++; };
  }, [address, zip, found, calculate, settings?.enabled, settings?.updated_at]);
  useEffect(() => {
    if (!quote) return;
    const timer = setTimeout(() => { setQuote(null); callback.current(null); setError("Frete expirado. Confira o endereço para recalcular."); }, Math.max(0, Date.parse(quote.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [quote]);
  const update = (key: keyof typeof address, value: string) => {
    revision.current++; callback.current(null); setQuote(null); setError(""); setBusy(false);
    setAddress((prev) => ({ ...prev, [key]: value }));
  };
  return <div className="space-y-4">
    {isPending ? <p className="text-sm text-muted-foreground">Carregando entrega...</p> : settingsError ? <p role="alert" className="text-sm text-destructive">Não foi possível carregar o delivery.</p> : !settings?.enabled ? <p role="status" className="text-sm text-muted-foreground">Entregas indisponíveis. A loja precisa configurar ou ativar o delivery para liberar o pagamento.</p> : null}
    <div className="space-y-2"><Label htmlFor="delivery-cep" className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> CEP de entrega</Label><Input id="delivery-cep" inputMode="numeric" autoComplete="postal-code" maxLength={9} placeholder="00000-000" value={zip} onChange={(e) => { revision.current++; callback.current(null); setQuote(null); setFound(false); setBusy(false); setError(""); setZip(e.target.value.replace(/[^\d-]/g, "")); }} className="h-12" /></div>
    {found && <div className="grid gap-3 sm:grid-cols-2">{([
      ["street", "Rua", "street-address"], ["number", "Número", "off"], ["complement", "Complemento (opcional)", "off"], ["neighborhood", "Bairro", "address-level3"], ["city", "Cidade", "address-level2"], ["state", "UF", "address-level1"],
    ] as const).map(([key, label, complete]) => <div key={key} className="space-y-1.5"><Label htmlFor={`destination-${key}`}>{label}</Label><Input id={`destination-${key}`} autoComplete={complete} value={address[key]} maxLength={key === "state" ? 2 : key === "number" ? 20 : 100} onChange={(e) => update(key, key === "state" ? e.target.value.toUpperCase() : e.target.value)} className="h-12" /></div>)}</div>}
    {busy && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {found ? "Calculando frete..." : "Buscando endereço..."}</p>}
    {error && <div role="alert" className="space-y-2"><p className="text-sm text-destructive">{error}</p><Button variant="outline" size="sm" onClick={() => { if (found) setAddress((v) => ({ ...v })); else setRetry((v) => v + 1); }}>Tentar novamente</Button></div>}
    {quote && <div className="flex flex-wrap items-center justify-between gap-3 border-y py-4 text-sm"><span className="flex items-center gap-2 font-bold text-primary"><Truck className="h-5 w-5" /> Frete {formatBRL(quote.shippingFee)}</span><span className="text-muted-foreground">{(quote.distanceMeters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km · cerca de {quote.minutes} min</span></div>}
    <p className="text-[10px] text-muted-foreground">CEP: ViaCEP · Distância: Google Maps</p>
  </div>;
}