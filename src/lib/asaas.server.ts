import { z } from "zod";
import { asaasPaymentSchema, verifiedAsaasPayment } from "./asaas";
import { asaasApiRequest, AsaasApiError, getGateway } from "./gateway.server";
export { AsaasApiError as AsaasError };
export async function asaasRequest(path: string, body?: unknown) {
  const gateway=await getGateway();
  return asaasApiRequest(gateway.apiKey,gateway.mode,path,body);
}
export async function findPaidAsaasPayment(checkoutId:string,total:number){
  const list=z.object({data:z.array(asaasPaymentSchema)}).parse(
    await asaasRequest(`/payments?checkoutSession=${encodeURIComponent(checkoutId)}&limit=100`));
  return list.data.find(p=>verifiedAsaasPayment(p,checkoutId,total));
}
