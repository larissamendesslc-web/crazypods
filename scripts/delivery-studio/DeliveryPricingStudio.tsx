import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { settingsQuery, saveDeliveryDemo } from "@/lib/settings";
import { CheckCircle2, MapPin, Plus, RotateCcw, Settings2, Trash2, XCircle } from "lucide-react";
import {
  calculateDeliveryQuote,
  exampleDeliveryConfig,
  validateDeliveryPolicy,
  type DeliveryBand,
  type DeliveryPolicy,
  type DeliveryZone,
  type DeliveryStudioConfig,
  type PaymentDemo,
  type StoreKey,
} from "@/lib/delivery-pricing";

const storeLabels: Record<StoreKey, string> = {
  quitauna: "Quitaúna",
  jardimBoaVista: "Jardim Boa Vista",
};
const demoPayments: { key: PaymentDemo; label: string }[] = [
  { key: "pix", label: "Pix" },
  { key: "card", label: "Cartão" },
  { key: "cash", label: "Dinheiro" },
];
const brl = (amount: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
const inputClass =
  "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400";
const freshDraft = (): DeliveryStudioConfig => ({
  quitauna: {
    ...exampleDeliveryConfig.quitauna,
    bands: exampleDeliveryConfig.quitauna.bands.map((band) => ({ ...band })),
    paymentDemos: [...exampleDeliveryConfig.quitauna.paymentDemos],
    zones: [],
  },
  jardimBoaVista: {
    ...exampleDeliveryConfig.jardimBoaVista,
    bands: exampleDeliveryConfig.jardimBoaVista.bands.map((band) => ({ ...band })),
    paymentDemos: [...exampleDeliveryConfig.jardimBoaVista.paymentDemos],
    zones: [],
  },
});

export function DeliveryPricingStudio() {
  const [storeId, setStoreId] = useState<StoreKey>("quitauna");
  const [draft, setDraft] = useState<DeliveryStudioConfig>(freshDraft);
  const { data: siteSettings, isPending: settingsPending } = useQuery(settingsQuery);
  const qc = useQueryClient();
  const loadedFromSettings = useRef(false);
  const [saving, setSaving] = useState(false);
  const [distance, setDistance] = useState("4.5");
  const [subtotal, setSubtotal] = useState("100");
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    if (!loadedFromSettings.current && siteSettings) {
      setDraft(siteSettings.deliveryPricingDemo);
      loadedFromSettings.current = true;
    }
  }, [siteSettings]);

  async function saveDraft() {
    const invalid = (["quitauna", "jardimBoaVista"] as const)
      .map(id => validateDeliveryPolicy(draft[id]))
      .find(Boolean);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setSaving(true);
    try {
      await saveDeliveryDemo(draft);
      await qc.invalidateQueries({ queryKey: settingsQuery.queryKey });
      toast.success("Tarifas demonstrativas salvas. O simulador do carrinho já pode utilizá-las.");
    } catch {
      toast.error("Não foi possível salvar as tarifas. Revise suas permissões.");
    } finally {
      setSaving(false);
    }
  }

  const policy = draft[storeId];
  const validation = validateDeliveryPolicy(policy);
  const quote = calculateDeliveryQuote(
    policy,
    distance.trim() === "" ? Number.NaN : Number(distance),
    subtotal.trim() === "" ? Number.NaN : Number(subtotal),
  );

  function edit(patch: Partial<DeliveryPolicy>) {
    setDraft((current) => ({ ...current, [storeId]: { ...current[storeId], ...patch } }));
  }

  function editBand(index: number, key: keyof DeliveryBand, value: number) {
    edit({
      bands: policy.bands.map((band, i) => i === index ? { ...band, [key]: value } : band),
    });
  }

  function changeZone(index: number, key: keyof DeliveryZone, value: string | number) {
    edit({ zones: (policy.zones ?? []).map((zone, i) =>
      i === index ? { ...zone, [key]: value } : zone) });
  }

  function addZone() {
    if ((policy.zones ?? []).length >= 40) return;
    edit({ zones: [...(policy.zones ?? []), { city: "Osasco", neighborhood: "", fee: 0 }] });
  }

  function addBand() {
    if (policy.bands.length >= 20) return;
    const last = policy.bands[policy.bands.length - 1];
    edit({
      bands: [...policy.bands, {
        upToKm: Math.min(100, Math.max(policy.maxDistanceKm, (last?.upToKm ?? 0) + 1)),
        fee: last?.fee ?? 0,
      }],
    });
  }

  function resetDraft() {
    setDraft(freshDraft());
    setDistance("4.5");
    setSubtotal("100");
    setShowJson(false);
  }

  const shortInput = (label: string, value: string | number, onChange: (value: number) => void, suffix?: string) => (
    <label className="block min-w-0 text-xs font-medium text-muted-foreground">
      {label}
      <div className="relative">
        <input
          type="number" min="0" step="0.01"
          className={inputClass + (suffix ? " pr-12" : "")}
          value={value}
          onChange={(event) => onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))}
        />
        {suffix && <span className="pointer-events-none absolute right-3 top-3.5 text-xs">{suffix}</span>}
      </div>
    </label>
  );

  return (
    <section className="relative isolate overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-lg sm:p-6" aria-labelledby="delivery-studio-title">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 -z-10 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-violet-400">
            <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
            Crazy Operations / Laboratory
          </div>
          <h2 id="delivery-studio-title" className="font-display text-2xl font-black tracking-tight sm:text-3xl">
            Delivery Studio <span className="text-violet-400">2.0</span>
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Planeje regiões, distâncias e tarifas de duas unidades, com resultado imediato.
            Este painel é uma simulação isolada e não altera pedidos ou cobranças.
          </p>
        </div>
        <span className="rounded-full border border-border bg-secondary/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Modo demonstrativo
        </span>
      </div>

      <div className="my-6 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-background/60 p-1.5" role="group" aria-label="Unidade para configurar">
        {(["quitauna", "jardimBoaVista"] as const).map((id) => (
          <button key={id} type="button" aria-pressed={storeId === id} onClick={() => setStoreId(id)}
            className={"flex min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-bold transition-all sm:text-sm " +
              (storeId === id ? "bg-violet-600 text-white shadow-lg shadow-violet-900/20" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{storeLabels[id]}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border bg-background/60 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold">Regras de frete</h3>
              <p className="mt-1 text-xs text-muted-foreground">Tarifas de exemplo, editáveis para testes nesta aba</p>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-semibold">
              <input type="checkbox" checked={policy.enabled} onChange={(e) => edit({ enabled: e.target.checked })}
                className="h-4 w-4 accent-violet-500" />
              Ativa
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {shortInput("Distância máxima", policy.maxDistanceKm, (n) => edit({ maxDistanceKm: n }), "km")}
            <label className="min-w-0 text-xs font-medium text-muted-foreground">
              Frete grátis a partir de (R$)
              <input type="number" min="0" step="0.01" placeholder="Sem frete grátis"
                className={inputClass} value={policy.freeAbove ?? ""}
                onChange={(e) => edit({ freeAbove: e.target.value === "" ? null : Number(e.target.value) })} />
            </label>
          </div>

          <div className="mb-2 mt-6 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Faixas por distância</h4>
            <span className="text-[11px] text-muted-foreground">{policy.bands.length} faixa(s)</span>
          </div>
          <div className="space-y-2">
            {policy.bands.map((band, index) => (
              <div key={index} className="grid grid-cols-[auto_1fr_1fr_auto] items-end gap-2 rounded-xl border border-border bg-card p-2.5">
                <span className="mb-3 w-5 text-center text-xs font-bold tabular-nums text-violet-400">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {shortInput("Até (km)", band.upToKm, (n) => editBand(index, "upToKm", n))}
                {shortInput("Taxa (R$)", band.fee, (n) => editBand(index, "fee", n))}
                <button type="button" disabled={policy.bands.length <= 1}
                  title="Excluir faixa" aria-label={"Remover faixa " + (index + 1)}
                  className="mb-1 rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
                  onClick={() => edit({ bands: policy.bands.filter((_, i) => i !== index) })}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className={buttonClass + " mt-3"} disabled={policy.bands.length >= 20} onClick={addBand}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Adicionar faixa
          </button>

          <div className="mt-5 border-t border-border pt-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Tarifas fixas por bairro
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  A consulta automática usa esta taxa quando o CEP coincide exatamente com
                  cidade e bairro; caso contrário, consulta a rota por quilômetros.
                </p>
              </div>
              <button type="button" className={buttonClass} disabled={(policy.zones ?? []).length >= 40}
                onClick={addZone}><Plus className="h-3.5 w-3.5" aria-hidden="true" /> Bairro</button>
            </div>
            <div className="mt-3 space-y-2">
              {(policy.zones ?? []).length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                  Nenhuma tarifa por bairro definida. Serão utilizadas somente as faixas por quilômetros.
                </p>
              )}
              {(policy.zones ?? []).map((zone, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 rounded-xl border border-border bg-card p-3">
                  <label className="block min-w-0 text-xs font-medium text-muted-foreground">
                    Cidade
                    <input className={inputClass} value={zone.city} maxLength={80}
                      onChange={e => changeZone(i, "city", e.target.value)} placeholder="Osasco" />
                  </label>
                  <label className="block min-w-0 text-xs font-medium text-muted-foreground">
                    Bairro
                    <input className={inputClass} value={zone.neighborhood} maxLength={80}
                      onChange={e => changeZone(i, "neighborhood", e.target.value)} placeholder="Quitaúna" />
                  </label>
                  <button type="button" title="Remover região" aria-label={"Remover região " + (i + 1)}
                    className="mb-1 rounded-lg p-2 text-muted-foreground hover:bg-secondary"
                    onClick={() => edit({ zones: (policy.zones ?? []).filter((_, j) => j !== i) })}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <label className="col-span-3 block text-xs font-medium text-muted-foreground">
                    Taxa fixa da entrega (R$)
                    <input type="number" min="0" max="10000" step="0.01" className={inputClass} value={zone.fee}
                      onChange={e => changeZone(i, "fee", e.target.value === "" ? Number.NaN : Number(e.target.value))} />
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Pagamentos ilustrativos</h4>
            <div className="flex flex-wrap gap-x-5 gap-y-3">
              {demoPayments.map(({ key, label }) => (
                <label key={key} className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-violet-500"
                    checked={policy.paymentDemos.includes(key)}
                    onChange={(e) => edit({ paymentDemos: e.target.checked
                      ? [...policy.paymentDemos, key]
                      : policy.paymentDemos.filter((one) => one !== key) })} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          {validation && (
            <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-xs text-amber-300">
              <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" /> {validation}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-background/60 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="font-display text-lg font-bold">Simulador</h3>
              <span className="rounded-lg bg-violet-500/10 px-2 py-1 text-[10px] font-bold text-violet-400">SEM ENVIO</span>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
              Teste as faixas com uma distância hipotética. No carrinho, o sistema consulta CEP e rota automaticamente e prioriza bairros configurados.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-medium text-muted-foreground">
                Distância (km)
                <input type="number" min="0" step="0.1" value={distance}
                  onChange={(e) => setDistance(e.target.value)} className={inputClass} />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Subtotal fictício (R$)
                <input type="number" min="0" step="0.01" value={subtotal}
                  onChange={(e) => setSubtotal(e.target.value)} className={inputClass} />
              </label>
            </div>
            <div className="mt-5 rounded-xl border border-border bg-card p-4">
              {quote.status === "ok" ? (
                <>
                  <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Dentro da cobertura simulada
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between gap-2 text-muted-foreground">
                      <span>Subtotal</span><span>{brl(Number(subtotal))}</span>
                    </div>
                    <div className="flex justify-between gap-2 text-muted-foreground">
                      <span>Entrega {quote.free ? "(grátis)" : ""}</span>
                      <span>{brl(quote.fee)}</span>
                    </div>
                    <div className="flex justify-between gap-2 border-t border-border pt-3 text-lg font-black text-foreground">
                      <span>Total simulado</span>
                      <span className="tabular-nums">{brl(quote.total)}</span>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Faixa aplicada: até {quote.band.upToKm.toLocaleString("pt-BR")} km
                  </p>
                </>
              ) : (
                <div role="status" className="flex items-start gap-2 text-sm text-muted-foreground">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{quote.reason}</span>
                </div>
              )}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Nenhum pedido, pagamento, cobrança ou mensagem de WhatsApp é criado por este painel.
            </p>
          </div>
          <div className="rounded-2xl border border-dashed border-violet-500/30 bg-violet-500/5 p-4">
            <h4 className="text-sm font-bold">Ambiente protegido</h4>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              As alterações só serão disponibilizadas no simulador do carrinho depois de clicar em
              Salvar regras. Nenhum pedido, pagamento real ou mensagem será criado.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <p className="text-xs text-muted-foreground">Tarifas fictícias • Integradas ao carrinho demonstrativo</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={saving || settingsPending} className={buttonClass + " bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50"} onClick={() => void saveDraft()}>
            {saving ? "Salvando..." : "Salvar regras do simulador"}
          </button>
          <button type="button" className={buttonClass} onClick={resetDraft}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Restaurar exemplo
          </button>
          <button type="button" className={buttonClass} aria-expanded={showJson} onClick={() => setShowJson(!showJson)}>
            {showJson ? "Ocultar" : "Ver"} configuração JSON
          </button>
        </div>
      </div>
      {showJson && (
        <label className="mt-4 block text-xs font-medium text-muted-foreground">
          Configuração de demonstração — selecione para copiar
          <textarea className={inputClass + " min-h-40 font-mono text-xs"}
            readOnly spellCheck={false} rows={9}
            value={JSON.stringify({ mode: "simulation-only", stores: draft }, null, 2)}
            onFocus={(e) => e.currentTarget.select()} />
        </label>
      )}
    </section>
  );
}
