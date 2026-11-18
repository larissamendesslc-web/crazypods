import { z } from "zod";
import { asaasPaymentSchema, verifiedAsaasPayment } from "./asaas";

export class AsaasError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function asaasRequest(path: string, body?: unknown) {
  const key = process.env['UDC_ASAAS_2_API_KEY'];
  const projectKey = process.env['LOVABLE_API_KEY'];
  if (!key || !projectKey) throw new Error("Asaas não configurado");
  const response = await fetch(`https://connector-gateway.lovable.dev/udc_asaas_2${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${projectKey}`, 'X-Connection-Api-Key': key, 'User-Agent': 'CrazyStore', 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) {
    const raw = await response.text();
    let message = "Não foi possível concluir a solicitação no Asaas";
    try {
      const parsed = z.object({ errors: z.array(z.object({ description: z.string() })) }).parse(JSON.parse(raw));
      message = parsed.errors.map((e) => e.description).join("; ");
    } catch { /* Never log raw responses that may contain credentials or personal data. */ }
    throw new AsaasError(response.status, `Asaas [${response.status}]: ${message}`);
  }
  return response.json() as Promise<unknown>;
}
export async function findPaidAsaasPayment(checkoutId: string, total: number) {
  const list = z.object({ data: z.array(asaasPaymentSchema) }).parse(await asaasRequest(`/payments?checkoutSession=${encodeURIComponent(checkoutId)}&limit=100`));
  return list.data.find((payment) => verifiedAsaasPayment(payment, checkoutId, total));
}