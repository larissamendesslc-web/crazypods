import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { stripePublishableKey } from "./stripe-config";

type StripeEnv = "sandbox" | "live";
const clientToken = stripePublishableKey;

function paymentsEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  throw new Error("Pagamentos online ainda não estão ativos nesta versão do site.");
}

let stripePromise: Promise<Stripe | null> | null = null;
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    paymentsEnvironment();
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}
export function getStripeEnvironment(): StripeEnv {
  return paymentsEnvironment();
}