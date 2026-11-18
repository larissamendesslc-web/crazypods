import { z } from "zod";
import { asaasPaymentSchema, verifiedAsaasPayment } from "./asaas";

// The Asaas API key exists ONLY in the Vercel server environment.
// Sandbox is deliberately hardcoded until live payment activation is explicitly approved.
const ASAAS_SANDBOX_API = "https://api-sandbox.asaas.com/v3";

export class AsaasError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function asaasRequest(path: string, body?: unknown) {
  const key = process.env["ASAAS_SANDBOX_API_KEY"];
  if (!key) throw new Error("Chave Sandbox não configurada. Defina ASAAS_SANDBOX_API_KEY na Vercel.");
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Caminho Asaas inválido");

  const response = await fetch(ASAAS_SANDBOX_API + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      access_token: key,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "CrazyStore/1.0 (crazypods.vercel.app)",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) {
    let message = response.status === 401
      ? "Chave da API Sandbox rejeitada pelo Asaas"
      : "Não foi possível concluir a solicitação no Asaas";
    try {
      const parsed = z.object({ errors: z.array(z.object({ description: z.string() })) })
        .safeParse(await response.json());
      if (parsed.success) message = parsed.data.errors.map((e) => e.description).join("; ");
    } catch { /* Never print API responses or secrets into logs. */ }
    throw new AsaasError(response.status, `Asaas [${response.status}]: ${message}`);
  }
  return response.json() as Promise<unknown>;
}

export async function findPaidAsaasPayment(checkoutId: string, total: number) {
  const list = z.object({ data: z.array(asaasPaymentSchema) })
    .parse(await asaasRequest(`/payments?checkoutSession=${encodeURIComponent(checkoutId)}&limit=100`));
  return list.data.find((payment) => verifiedAsaasPayment(payment, checkoutId, total));
}
