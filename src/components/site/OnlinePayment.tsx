import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createOrderCheckout, createLegacyStripeCheckout } from "@/utils/payments.functions";

export function OnlinePayment({ orderId, legacyStripe = false, onComplete }: { orderId: string; legacyStripe?: boolean; onComplete: () => void }) {
  if (legacyStripe) return <LegacyPayment orderId={orderId} onComplete={onComplete} />;
  return <AsaasPayment orderId={orderId} onComplete={onComplete} />;
}
function AsaasPayment({ orderId, onComplete }: { orderId: string; onComplete: () => void }) {
  const create = useServerFn(createOrderCheckout);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function pay() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = await create({ data: { orderId, origin: window.location.origin } });
      if ("error" in result) throw new Error(result.error);
      if (!result.checkoutUrl) throw new Error("Pagamento indisponível");
      window.location.assign(result.checkoutUrl);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível abrir o pagamento"); setBusy(false); }
  }
  return <div className="space-y-4 border-y py-6">
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button variant="neon" className="w-full" disabled={busy} onClick={() => void pay()}>{busy ? "Preparando pagamento..." : "Pagar com Pix ou cartão"}</Button>
    <Button variant="outline" className="w-full" onClick={onComplete}>Já paguei · verificar pagamento</Button>
  </div>;
}
function LegacyPayment({ orderId, onComplete }: { orderId: string; onComplete: () => void }) {
  const create = useServerFn(createLegacyStripeCheckout);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const fetchClientSecret = async () => {
    try {
    const r = await create({
      data: {
        orderId,
        environment: getStripeEnvironment(),
        returnUrl: `${window.location.origin}/pedido/${orderId}?session_id={CHECKOUT_SESSION_ID}`,
      },
    });
    if ("error" in r) throw new Error(r.error);
    return r.clientSecret;
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível abrir o pagamento"); throw e; }
  };
  if (error) return <div role="alert" className="space-y-3 border-y py-5"><p className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={() => { setError(""); setAttempt((v) => v + 1); }}>Tentar novamente</Button><Button variant="outline" onClick={onComplete}>Verificar pagamento</Button></div>;
  return (
    <div className="overflow-hidden rounded-3xl bg-card">
      <EmbeddedCheckoutProvider key={attempt} stripe={getStripe()} options={{ fetchClientSecret, onComplete }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}