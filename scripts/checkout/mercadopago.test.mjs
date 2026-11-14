import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  buildCheckoutPreference, createHostedCheckout, validateApprovedOrder,
  validateMercadoPagoSignature,
} from "./mercadopago.server.ts";
const id = "8c9c5e27-f57c-4334-81da-3afba47c20dd";
const reservation = "2d783e98-24b9-412c-a705-cc28818b7f85";
const authorization = "9f96cb99-f9a1-4d28-ae5e-f4c2398c9c5e";
const productId = "b0fd9920-858d-480c-8313-dea531364a6a";
const order = () => ({
  id, status:"reserved", currency:"BRL",
  subtotalCents:8990, shippingCents:1000, totalCents:9990,
  expiresAt:new Date(Date.now()+3600000).toISOString(),
  buyerEmail:"client@example.org",
  saleAuthorizationId:authorization, stockReservationId:reservation,
  lines:[{productId,title:"Fone de ouvido",unitCents:8990,quantity:1}],
});
const config = {accessToken:"APP_USR_EXAMPLE_ACCESS_TOKEN_NOT_REAL_2026",webhookSecret:"DEMO_SECRET_FOR_TESTS_ONLY_DO_NOT_COPY",publicOrigin:"https://store.example.org"};
test("server order in centavos yields exact hosted checkout item totals",()=>{
 const p=buildCheckoutPreference(order(),config.publicOrigin);
 assert.equal(p.items.length,2);
 assert.equal(p.items[0].unit_price,89.9);
 assert.equal(p.items[1].unit_price,10);
 assert.equal(p.external_reference,id);
 assert.equal(p.notification_url,"https://store.example.org/api/checkout/mp-webhook");
});
test("tampered totals, unreserved order and expired order are blocked",()=>{
 assert.throws(()=>validateApprovedOrder({...order(),totalCents:8990}));
 assert.throws(()=>validateApprovedOrder({...order(),status:"pending"}));
 assert.throws(()=>validateApprovedOrder({...order(),stockReservationId:""}));
 assert.throws(()=>validateApprovedOrder({...order(),expiresAt:"2020-01-01T00:00:00.000Z"}));
});
test("checkout provider receives only verified server lines and stable idempotency key",async()=>{
 let actual;
 const fetcher=async (url,init)=>{
  actual={url,init};
  return {ok:true,json:async()=>({id:"pref-001",init_point:"https://www.mercadopago.com.br/checkout/v1/redirect"})};
 };
 const result=await createHostedCheckout(config,order(),fetcher);
 assert.equal(result.preferenceId,"pref-001");
 assert.equal(actual.init.headers["X-Idempotency-Key"],id);
 const payload=JSON.parse(actual.init.body);
 assert.equal(payload.items.reduce((sum,x)=>sum+x.unit_price*x.quantity,0),99.9);
});
test("unknown provider redirect URL is refused",async()=>{
 const fetcher=async()=>({ok:true,json:async()=>({id:"fake",init_point:"https://evil.example/payment"})});
 await assert.rejects(()=>createHostedCheckout(config,order(),fetcher),/não foi reconhecido/);
});
test("signed webhook accepts authentic HMAC only",()=>{
 const ts=String(Date.now()), dataId="123456789", requestId="req-abc-123";
 const manifest=`id:${dataId};request-id:${requestId};ts:${ts};`;
 const signature=createHmac("sha256",config.webhookSecret).update(manifest).digest("hex");
 const base={signature:`ts=${ts},v1=${signature}`,requestId,dataId,secret:config.webhookSecret};
 assert.equal(validateMercadoPagoSignature(base),true);
 assert.equal(validateMercadoPagoSignature({...base,dataId:"987654321"}),false);
 assert.equal(validateMercadoPagoSignature({...base,now:Number(ts)+11*60*1000}),false);
});
