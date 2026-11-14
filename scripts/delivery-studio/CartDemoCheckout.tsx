import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calculator, CheckCircle2, CreditCard, Info, MapPin, Navigation, RotateCcw, Truck } from "lucide-react";
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
  const [unit, setUnit] = useState<StoreId>("quitauna");
  const [manualKm, setManualKm] = useState("4.5");
  const [mode, setMode] = useState<"manual" | "road">("manual");
  const [payment, setPayment] = useState<PaymentDemo | "">("pix");
  const [routeBusy, setRouteBusy] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [routes, setRoutes] = useState<{ key: string; values: RoadRoute[] } | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const postalCode = digits(cep);
  const postalLookup = useQuery({
    queryKey: ["delivery-demo-cep", postalCode],
    enabled: postalCode.length === 8 && items.length > 0,
    queryFn: ({ signal }) => lookupCep(postalCode, signal),
    staleTime: 300_000,
    retry: false,
  });
  const address = postalLookup.data && digits(postalLookup.data.cep) === postalCode
    ? postalLookup.data : null;
  const configuredStores = storeKeys.flatMap((id) => {
    const coordinates = deliveryStores[id]?.coordinates;
    return coordinates ? [{ id, coordinates }] : [];
  });
  const routeKey = postalCode + "|" + JSON.stringify(configuredStores);
  const currentRoutes = routes?.key === routeKey ? routes.values : [];
  const roadDistance = currentRoutes.find(route => route.storeId === unit);
  const usingRoad = mode === "road" && !!roadDistance;
  const km = usingRoad ? roadDistance.km : manualKm.trim() === "" ? Number.NaN : Number(manualKm);
  const policy = deliveryPolicy[unit];
  const quote = calculateDeliveryQuote(policy, km, subtotal);
  const availablePayments = policy.paymentDemos;
  const selectedPayment = availablePayments.includes(payment as PaymentDemo) ? payment : "";

  function updateCep(value: string) {
    setCep(formatCep(value));
    setRoutes(null);
    setMode("manual");
    setRouteError("");
    setPreview(null);
    setError("");
  }

  async function calculateRoads() {
    if (!address?.coordinates || configuredStores.length === 0) {
      setRouteError("O CEP ou as unidades não têm coordenadas disponíveis. Utilize a simulação manual.");
      return;
    }
    setRouteBusy(true);
    setRouteError("");
    setPreview(null);
    try {
      const result = await calculateDemoRoadRoutes(configuredStores, address.coordinates);
      // A query started for an older CEP is discarded by the key when rendered.
      const sorted = [...result].sort((a, b) => {
        const aAllowed = calculateDeliveryQuote(deliveryPolicy[a.storeId], a.km, subtotal).status === "ok";
        const bAllowed = calculateDeliveryQuote(deliveryPolicy[b.storeId], b.km, subtotal).status === "ok";
        return Number(bAllowed) - Number(aAllowed) || a.km - b.km;
      });
      setRoutes({ key: routeKey, values: result });
      setUnit(sorted[0].storeId);
      setMode("road");
    } catch (cause) {
      setRoutes(null);
      setMode("manual");
      setRouteError(cause instanceof Error ? cause.message : "Falha ao consultar a rota.");
    } finally {
      setRouteBusy(false);
    }
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
    if (quote.status !== "ok") {
      setError(quote.reason);
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
      store: unit,
      km,
      payment: selectedPayment,
      method: usingRoad ? "road" : "manual",
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
                <select value={unit} className={fieldStyle} onChange={event => { setUnit(event.target.value as StoreId); setPreview(null); }}>
                  {storeKeys.map(id => (
                    <option key={id} value={id}>{storeNames[id]} · Osasco</option>
                  ))}
                </select>
              </label>

              <Button type="button" variant="outline" className="h-auto min-h-11 w-full whitespace-normal rounded-xl"
                disabled={routeBusy || !address?.coordinates || configuredStores.length === 0} onClick={() => void calculateRoads()}>
                <Navigation className="h-4 w-4 shrink-0" aria-hidden="true" />
                {routeBusy ? "Calculando rotas..." : "Calcular distância pelas ruas (teste)"}
              </Button>
              {!address?.coordinates && address && (
                <p className="text-xs text-muted-foreground">
                  Este CEP não forneceu coordenadas. É possível testar informando uma distância manual.
                </p>
              )}
              {configuredStores.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Cadastre as coordenadas das lojas no painel administrativo para habilitar a consulta de rotas.
                </p>
              )}
              {routeError && (
                <p role="alert" className="rounded-lg border border-amber-500/30 p-2 text-xs text-amber-500">
                  {routeError} Use uma distância manual para continuar testando.
                </p>
              )}
              {currentRoutes.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-3 text-xs">
                  {currentRoutes.map(r => (
                    <div key={r.storeId} className="flex justify-between gap-3 py-1">
                      <span>{storeNames[r.storeId]}</span>
                      <strong>{distanceFormat(r.km)} km · ~{r.minutes} min</strong>
                    </div>
                  ))}
                  <p className="mt-2 text-muted-foreground">
                    Rota aproximada pelo CEP, sem considerar o número do imóvel ou trânsito.
                  </p>
                </div>
              )}
              {usingRoad && (
                <p role="status" className="text-xs text-emerald-400">
                  Distância da unidade selecionada: {distanceFormat(roadDistance.km)} km por ruas.
                </p>
              )}
              <label className="block text-xs font-medium text-muted-foreground">
                Distância manual para testes (km)
                <Input type="number" min="0" max="100" step="0.1" value={manualKm} className={fieldStyle}
                  onChange={event => { setManualKm(event.target.value); setMode("manual"); setPreview(null); }} />
              </label>
              <p className="text-[11px] text-muted-foreground">
                {usingRoad
                  ? "Tarifa calculada com o percurso demonstrativo consultado."
                  : "Tarifa calculada com distância digitada manualmente, sem comprovação de rota."}
                {" "}Rotas pelo OSRM / OpenStreetMap (serviço público sem garantia).
              </p>
              <div className="rounded-xl border border-violet-500/20 bg-card p-3">
                {quote.status === "ok" ? (
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
                    <p className="text-[11px] text-muted-foreground">Faixa: até {distanceFormat(quote.band.upToKm)} km · {storeNames[unit]}</p>
                  </div>
                ) : (
                  <p role="status" className="flex items-start gap-2 text-xs text-amber-500">
                    <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {quote.reason}
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

            {preview && (
              <section role="status" className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
                <div className="flex items-center gap-2 font-extrabold text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  Simulação concluída
                </div>
                <p className="text-xs text-muted-foreground">Nenhum pedido foi criado e nenhum dado foi enviado à loja.</p>
                <p>Unidade: <strong>{storeNames[preview.store]}</strong></p>
                <p>Distância: <strong>{distanceFormat(preview.km)} km ({preview.method === "road" ? "rota por CEP" : "manual"})</strong></p>
                <p>Frete: <strong>{brlFmt(preview.shipping)}</strong> · Total: <strong>{brlFmt(preview.total)}</strong></p>
                <p>Pagamento fictício: <strong>{paymentLabels[preview.payment as PaymentDemo]}</strong></p>
              </section>
            )}
          </>
        )}
      </div>
      {items.length > 0 && (
        <div className="shrink-0 border-t border-border bg-card px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">Subtotal do teste</span>
            <span className="font-display text-xl font-extrabold tabular-nums">{brlFmt(subtotal)}</span>
          </div>
          {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
          <Button type="submit" disabled={quote.status !== "ok"}
            className="mt-3 h-auto min-h-12 w-full whitespace-normal rounded-xl bg-violet-600 py-3 font-bold text-white hover:bg-violet-500">
            <Calculator className="h-4 w-4" aria-hidden="true" />
            {preview ? "Recalcular simulação" : "Concluir simulação (sem compra)"}
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">Teste interno de experiência. Não é checkout comercial.</p>
        </div>
      )}
    </form>
  );
}
