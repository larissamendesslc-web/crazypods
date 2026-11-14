import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calculator, CheckCircle2, CreditCard, Info, MapPin, Navigation, RefreshCw, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckoutCepSearch } from "@/components/checkout-cep-search";
import { brlFmt, cartCount, cartTotal, type CartItem } from "@/lib/cart";
import { digits, formatCep, lookupCep, storeNames, type DeliveryStore, type StoreId } from "@/lib/delivery";
import { calculateDeliveryQuote, type DeliveryStudioConfig, type PaymentDemo } from "@/lib/delivery-pricing";
import { calculateDemoRoadRoutes, type RoadRoute } from "@/lib/demo-road-routes";

type Props = {
  items: CartItem[];
  deliveryStores: Record<StoreId, DeliveryStore>;
  deliveryPolicy: DeliveryStudioConfig;
  whatsappBase?: string;
  onComplete?: () => void;
  onClear: () => void;
  children: ReactNode;
};
type Preview = {
  subtotal: number;
  shipping: number;
  total: number;
  store: StoreId;
  km: number;
  payment: PaymentDemo | "";
  method: "road" | "manual";
  signature: string;
};
const storeKeys: StoreId[] = ["quitauna", "jardimBoaVista"];
const paymentLabels: Record<PaymentDemo, string> = {
  pix: "Pix (simulado)",
  card: "Cartão (simulado)",
  cash: "Dinheiro (simulado)",
};
const fieldStyle = "mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-base text-foreground focus:border-violet-500";
const distanceFormat = (km: number) => km.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/**
 * Demonstration only. This component deliberately NEVER calls create_shop_order,
 * payment gateways, site inventory, or wa.me. It replaces commercial checkout
 * whenever the site uses its current product data as demonstration fixtures.
 */
export function CartCheckout({ items, deliveryStores, deliveryPolicy, onClear, children }: Props) {
  const subtotal = cartTotal(items);
  const [cep, setCep] = useState("");
  const [showCepSearch, setShowCepSearch] = useState(false);
  const [unit, setUnit] = useState<StoreId | null>(null);
  const [manualKm, setManualKm] = useState("");
  const [mode, setMode] = useState<"manual" | "road">("road");
  const [showManual, setShowManual] = useState(false);
  const [payment, setPayment] = useState<PaymentDemo | "">("pix");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const postalCode = digits(cep);
  const postalLookup = useQuery({
    queryKey: ["delivery-demo-cep", postalCode],
    enabled: postalCode.length === 8 && items.length > 0,
    queryFn: ({ signal }) => lookupCep(postalCode, signal),
    staleTime: 300_000,
    gcTime: 900_000,
    retry: false,
  });
  const address = postalLookup.data && digits(postalLookup.data.cep) === postalCode
    ? postalLookup.data : null;
  const configuredStores = storeKeys.flatMap((id) => {
    const coordinates = deliveryStores[id]?.coordinates;
    return coordinates && Number.isFinite(coordinates.latitude) && Number.isFinite(coordinates.longitude)
      ? [{ id, coordinates }] : [];
  });

  const originKey = JSON.stringify(configuredStores);
  const destinationKey = JSON.stringify(address?.coordinates ?? null);
  const canRequestRoads = items.length > 0 && postalCode.length === 8 &&
    !!address?.coordinates && configuredStores.length > 0;
  // One query after valid CEP + geocoded address. React Query deduplicates
  // active requests, caches per location, and cancels stale ZIP changes.
  const roadLookup = useQuery({
    queryKey: ["delivery-demo-road-auto-v3", postalCode, originKey, destinationKey],
    enabled: canRequestRoads,
    queryFn: ({ signal }) => {
      if (!address?.coordinates) throw new Error("Endereço sem coordenadas.");
      return calculateDemoRoadRoutes(configuredStores, address.coordinates, signal);
    },
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const currentRoutes: RoadRoute[] = canRequestRoads ? (roadLookup.data ?? []) : [];
  const rankedRoutes = [...currentRoutes].sort((first, second) => {
    const firstOk = calculateDeliveryQuote(deliveryPolicy[first.storeId], first.km, subtotal).status === "ok";
    const secondOk = calculateDeliveryQuote(deliveryPolicy[second.storeId], second.km, subtotal).status === "ok";
    return Number(secondOk) - Number(firstOk) || first.km - second.km;
  });
  const recommendedUnit = rankedRoutes[0]?.storeId ?? "quitauna";
  const selectedUnit = unit ?? recommendedUnit;
  const roadDistance = currentRoutes.find(route => route.storeId === selectedUnit);
  const usingRoad = mode === "road" && !!roadDistance;
  const km = mode === "manual" && manualKm.trim() !== "" ? Number(manualKm)
    : usingRoad ? roadDistance.km : Number.NaN;
  const policy = deliveryPolicy[selectedUnit];
  const quote = Number.isFinite(km) ? calculateDeliveryQuote(policy, km, subtotal) : null;
  const availablePayments = policy.paymentDemos;
  const selectedPayment = availablePayments.includes(payment as PaymentDemo) ? payment : "";
  const quoteStatus = !quote
    ? !address ? "Informe seu CEP para calcular a entrega automaticamente."
    : canRequestRoads && roadLookup.isFetching ? "Consultando trajetos e tarifas..."
    : canRequestRoads && roadLookup.isError ? "Não foi possível consultar a rota. Tente novamente."
    : !address.coordinates ? "Este CEP não possui coordenadas suficientes para cotação por ruas."
    : !configuredStores.length ? "Configure os endereços das unidades para calcular a entrega."
    : "Ainda não há uma rota disponível para este endereço."
    : quote.status === "ok" ? null : quote.reason;
  const previewSignature = JSON.stringify({
    cep: postalCode, store: selectedUnit, distance: km, subtotal, fee: quote?.status === "ok" ? quote.fee : null,
    method: usingRoad ? "road" : mode, payment: selectedPayment,
  });
  const activePreview = preview?.signature === previewSignature ? preview : null;

  function updateCep(value: string) {
    setCep(formatCep(value));
    setUnit(null);
    setMode("road");
    setManualKm("");
    setShowManual(false);
    setPreview(null);
    setError("");
  }

  function simulate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreview(null);
    setError("");
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const phone = digits(String(form.get("phone") ?? ""));
    const number = String(form.get("number") ?? "").trim();
    const street = address?.street || String(form.get("street") ?? "").trim();
    if (!address || postalCode.length !== 8) {
      setError("Preencha um CEP válido para simular o frete.");
      return;
    }
    if (name.length < 2 || !/^(?:55)?[1-9][0-9]{9,10}$/.test(phone) || !number || !street) {
      setError("Confira nome, telefone, rua e número antes de simular.");
      return;
    }
    if (!quote || quote.status !== "ok") {
      setError(quoteStatus || "Não foi possível calcular o frete.");
      return;
    }
    if (!selectedPayment) {
      setError("Escolha uma forma de pagamento demonstrativa.");
      return;
    }
    setPreview({
      subtotal,
      shipping: quote.fee,
      total: quote.total,
      store: selectedUnit,
      km,
      payment: selectedPayment,
      method: usingRoad ? "road" : "manual",
      signature: previewSignature,
    });
  }

  return (
    <form onSubmit={simulate} className="flex min-h-0 flex-1 flex-col">
      <div className="volt-cart-scroll min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 p-3 text-sm">
          <Calculator className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" aria-hidden="true" />
          <div>
            <p className="font-bold text-foreground">Ambiente de testes — Crazy Delivery 2.0</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Use os itens do catálogo para simular entrega e pagamentos.
              Nenhum pedido será criado, enviado ou cobrado.
            </p>
          </div>
        </div>

        {items.length > 0 ? (
          <section aria-label="Produtos de demonstração" className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold">Produtos do teste</h2>
              <Button type="button" variant="ghost" onClick={onClear} className="h-9 px-2 text-xs text-muted-foreground">
                Esvaziar carrinho
              </Button>
            </div>
            {children}
          </section>
        ) : children}

        {items.length > 0 && (
          <>
            <section aria-labelledby="demo-address" className="space-y-3 rounded-xl border border-border bg-secondary/40 p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-violet-400" aria-hidden="true" />
                <h2 id="demo-address" className="font-display font-bold">Endereço do teste</h2>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-muted-foreground">
                  Nome
                  <Input name="name" autoComplete="name" required minLength={2} maxLength={120} className={fieldStyle} placeholder="Seu nome" />
                </label>
                <label className="block text-xs font-medium text-muted-foreground">
                  Telefone com DDD
                  <Input name="phone" autoComplete="tel" type="tel" required maxLength={25} className={fieldStyle} placeholder="(11) 99999-9999" />
                </label>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="demo-cep" className="text-xs font-medium text-muted-foreground">CEP</label>
                  <Button type="button" variant="ghost" aria-expanded={showCepSearch}
                    className="h-9 px-2 text-xs" onClick={() => setShowCepSearch(v => !v)}>
                    {showCepSearch ? "Fechar busca" : "Não sei meu CEP"}
                  </Button>
                </div>
                <Input id="demo-cep" value={cep} onChange={(e) => updateCep(e.target.value)}
                  autoComplete="postal-code" inputMode="numeric" required pattern="[0-9]{5}-[0-9]{3}"
                  className={fieldStyle} placeholder="00000-000" />
                {showCepSearch && (
                  <div className="mt-2">
                    <CheckoutCepSearch onSelect={value => { updateCep(value); setShowCepSearch(false); }} />
                  </div>
                )}
                {postalLookup.isFetching && <p role="status" className="mt-2 text-xs text-muted-foreground">Consultando endereço...</p>}
                {postalCode.length === 8 && (postalLookup.isError || postalLookup.data === null) && (
                  <p role="alert" className="mt-2 text-xs text-destructive">Não foi possível encontrar este CEP.</p>
                )}
                {address && (
                  <p role="status" className="mt-2 rounded-lg bg-card p-3 text-xs text-muted-foreground">
                    {[address.street, address.district, address.city, address.state].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              {address && !address.street && (
                <label className="block text-xs font-medium text-muted-foreground">
                  Rua ou avenida
                  <Input name="street" autoComplete="address-line1" required maxLength={150} className={fieldStyle} placeholder="Rua ou avenida" />
                </label>
              )}
              <div className="grid grid-cols-[minmax(100px,1fr)_minmax(0,2fr)] gap-3">
                <label className="block text-xs font-medium text-muted-foreground">
                  Número
                  <Input name="number" required maxLength={20} className={fieldStyle} placeholder="123" />
                </label>
                <label className="block text-xs font-medium text-muted-foreground">
                  Complemento (opcional)
                  <Input name="complement" maxLength={100} className={fieldStyle} placeholder="Bloco, apto..." />
                </label>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Nome, telefone e complemento não são enviados ao servidor pelo simulador.
              </p>
            </section>

            <section aria-labelledby="demo-shipping" className="space-y-3 rounded-xl border border-border bg-secondary/40 p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-violet-400" aria-hidden="true" />
                <h2 id="demo-shipping" className="font-display font-bold">Calcular entrega</h2>
              </div>
              <label className="block text-xs font-medium text-muted-foreground">
                Unidade da simulação
                <select value={selectedUnit} className={fieldStyle} onChange={event => { setUnit(event.target.value as StoreId); setPreview(null); }}>
                  {storeKeys.map(id => (
                    <option key={id} value={id}>{storeNames[id]} · Osasco</option>
                  ))}
                </select>
              </label>

              <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-violet-400" aria-hidden="true" />
                    <span className="font-bold">Cálculo automático pelo CEP</span>
                  </div>
                  {roadLookup.isFetching && <span role="status" className="animate-pulse text-violet-400">Calculando...</span>}
                </div>
                {currentRoutes.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {currentRoutes.map(r => (
                      <div key={r.storeId} className="flex justify-between gap-3">
                        <span>{storeNames[r.storeId]}</span>
                        <strong>{distanceFormat(r.km)} km · ~{r.minutes} min</strong>
                      </div>
                    ))}
                    <p className="mt-2 text-emerald-400">
                      Unidade indicada: {storeNames[recommendedUnit]} · percurso aproximado
                    </p>
                  </div>
                )}
                {!address?.coordinates && address && (
                  <p className="mt-2 text-amber-500">
                    Este CEP não trouxe coordenadas; não é possível calcular uma rota confiável.
                  </p>
                )}
                {configuredStores.length === 0 && (
                  <p className="mt-2 text-amber-500">
                    Cadastre coordenadas das duas unidades em Configurações → Unidades de entrega.
                  </p>
                )}
                {roadLookup.isError && canRequestRoads && (
                  <div className="mt-2 space-y-2">
                    <p role="alert" className="text-amber-500">
                      O serviço de rotas está indisponível. Nenhuma taxa será estimada sem dados.
                    </p>
                    <Button type="button" variant="outline" className="h-9" onClick={() => void roadLookup.refetch()}>
                      <RefreshCw className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Tentar novamente
                    </Button>
                  </div>
                )}
              </div>
              <details className="rounded-xl border border-border bg-card p-3 text-xs">
                <summary className="cursor-pointer font-semibold text-muted-foreground">
                  Simular distância manualmente (apenas testes)
                </summary>
                <label className="mt-3 block text-xs font-medium text-muted-foreground">
                  Distância informada pelo operador (km)
                  <Input type="number" min="0" max="100" step="0.1" value={manualKm} className={fieldStyle}
                    onChange={event => {
                      setManualKm(event.target.value); setMode("manual"); setShowManual(true); setPreview(null);
                    }} />
                </label>
                {showManual && currentRoutes.length > 0 && (
                  <Button className="mt-2 h-9 w-full" type="button" variant="outline"
                    onClick={() => { setMode("road"); setShowManual(false); setPreview(null); }}>
                    Voltar para cotação automática
                  </Button>
                )}
                <p className="mt-2 leading-relaxed text-muted-foreground">
                  Distância manual não é um preço oficial de entrega e nunca substitui uma cotação real.
                </p>
              </details>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Rotas estimadas pelas coordenadas do CEP, sem considerar o número do imóvel ou trânsito.
                Dados OpenStreetMap / OSRM demonstrativo, sujeitos a indisponibilidade.
              </p>
              <div className="rounded-xl border border-violet-500/20 bg-card p-3">
                {quote?.status === "ok" ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2 text-muted-foreground">
                      <span>Subtotal ({cartCount(items)})</span><span className="tabular-nums">{brlFmt(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-muted-foreground">
                      <span>Entrega simulada</span><strong className="tabular-nums text-foreground">{quote.free ? "Grátis" : brlFmt(quote.fee)}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-border pt-2 font-extrabold">
                      <span>Total estimado</span><span className="text-lg tabular-nums">{brlFmt(quote.total)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Faixa: até {distanceFormat(quote.band.upToKm)} km · {storeNames[selectedUnit]}</p>
                  </div>
                ) : (
                  <p role="status" className="flex items-start gap-2 text-xs text-amber-500">
                    <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {quoteStatus}
                  </p>
                )}
              </div>
            </section>

            <section aria-labelledby="demo-payment" className="space-y-3 rounded-xl border border-border bg-secondary/40 p-3 sm:p-4">
              <h2 id="demo-payment" className="flex items-center gap-2 font-display font-bold">
                <CreditCard className="h-4 w-4 text-violet-400" aria-hidden="true" /> Forma de pagamento ilustrativa
              </h2>
              {availablePayments.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum método configurado para esta unidade.</p>
              ) : (
                <div className="grid gap-2">
                  {availablePayments.map(method => (
                    <label key={method} className={"flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition " +
                      (selectedPayment === method ? "border-violet-500/60 bg-violet-500/10" : "border-border bg-card")}>
                      <input type="radio" checked={selectedPayment === method}
                        onChange={() => { setPayment(method); setPreview(null); }}
                        className="accent-violet-500" />
                      {paymentLabels[method]}
                    </label>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">Não há PIX, processamento de cartões ou transação real.</p>
            </section>

            {activePreview && (
              <section role="status" className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
                <div className="flex items-center gap-2 font-extrabold text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  Simulação concluída
                </div>
                <p className="text-xs text-muted-foreground">Nenhum pedido foi criado e nenhum dado foi enviado à loja.</p>
                <p>Unidade: <strong>{storeNames[activePreview.store]}</strong></p>
                <p>Distância: <strong>{distanceFormat(activePreview.km)} km ({activePreview.method === "road" ? "rota por CEP" : "manual"})</strong></p>
                <p>Frete: <strong>{brlFmt(activePreview.shipping)}</strong> · Total: <strong>{brlFmt(activePreview.total)}</strong></p>
                <p>Pagamento fictício: <strong>{paymentLabels[activePreview.payment as PaymentDemo]}</strong></p>
              </section>
            )}
          </>
        )}
      </div>
      {items.length > 0 && (
        <div className="shrink-0 border-t border-border bg-card px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2 text-muted-foreground">
              <span>Subtotal ({cartCount(items)})</span>
              <span className="tabular-nums">{brlFmt(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-muted-foreground">
              <span>Frete</span>
              <span className="tabular-nums">{quote?.status === "ok" ? (quote.free ? "Grátis" : brlFmt(quote.fee)) : (roadLookup.isFetching && mode === "road" ? "Calculando..." : "A calcular")}</span>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border pt-2 font-extrabold">
              <span>Total estimado</span>
              <span role="status" aria-live="polite" className="font-display text-xl tabular-nums">
                {quote?.status === "ok" ? brlFmt(quote.total) : "—"}
              </span>
            </div>
          </div>
          {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
          <Button type="submit" disabled={quote?.status !== "ok" || roadLookup.isFetching && mode === "road"}
            className="mt-3 h-auto min-h-12 w-full whitespace-normal rounded-xl bg-violet-600 py-3 font-bold text-white hover:bg-violet-500">
            <Calculator className="h-4 w-4" aria-hidden="true" />
            {activePreview ? "Recalcular simulação" : "Concluir simulação (sem compra)"}
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">Teste interno de experiência. Não é checkout comercial.</p>
        </div>
      )}
    </form>
  );
}
