import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { asaasRequest, findPaidAsaasPayment } from "@/lib/asaas.server";
import { backendRpc, getGateway } from "@/lib/gateway.server";

const eventSchema=z.object({
 event:z.string(),
 checkout:z.object({id:z.string().uuid()}).optional(),
 payment:z.object({id:z.string()}).optional(),
});
export const Route=createFileRoute("/api/public/payments/asaas-webhook")({
 server:{handlers:{POST:async({request})=>{
  let gateway;
  try{gateway=await getGateway()}catch{return new Response("Asaas not connected",{status:503})}
  const header=request.headers.get("asaas-access-token")??"";
  const expected=gateway.webhookToken;
  if(!header||Buffer.byteLength(header)!==Buffer.byteLength(expected)||
   !timingSafeEqual(Buffer.from(header),Buffer.from(expected))){
    return new Response("Unauthorized",{status:401});
  }
  try{
   const event=eventSchema.parse(await request.json());
   let checkoutId=event.checkout?.id;
   if(!checkoutId&&event.payment){
    const payment=z.object({checkoutSession:z.string().uuid().nullable().optional()}).parse(
     await asaasRequest(`/payments/${encodeURIComponent(event.payment.id)}`));
    checkoutId=payment.checkoutSession??undefined;
   }
   if(!checkoutId)return Response.json({received:true});
   const matches=await backendRpc<Array<{id:string;total:number;status:string;payment_method:string}>>(
    "backend_lookup_checkout",{_checkout_id:checkoutId});
   const order=matches?.[0];
   if(!order||order.status!=="pendente"||order.payment_method!=="online")return Response.json({received:true});
   const paid=await findPaidAsaasPayment(checkoutId,Number(order.total));
   if(paid){
    await backendRpc("backend_confirm_checkout",{
     _order_id:order.id,_checkout_id:checkoutId,_paid:true,_state:"paid"
    });
   }else if(event.event==="CHECKOUT_CANCELED"||event.event==="CHECKOUT_EXPIRED"){
    await backendRpc("backend_confirm_checkout",{
     _order_id:order.id,_checkout_id:checkoutId,_paid:false,
     _state:event.event==="CHECKOUT_EXPIRED"?"expired":"canceled"
    });
   }
   return Response.json({received:true});
  }catch(e){
   console.error("Webhook Asaas: evento recusado",e instanceof Error?e.name:"unknown");
   return new Response("Webhook processing failed",{status:500});
  }
 }}}
});
