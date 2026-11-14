import { describe,it,expect } from "vitest";
import { createSampleOrder,makeItems,defaultState,encodeReference,decodeReference,importReference } from "./orders-demo";

const fakeCustomer={name:"Pessoa Exemplo",phone:"11999990000",cep:"00000000",street:"Rua de Teste",number:"17",district:"Exemplo",city:"Cidade Fictícia",state:"SP"};
describe("Crazy Orders native WhatsApp handoff — demo only",()=>{
 it("rejects empty quantities",()=>{expect(()=>makeItems({agenda:0,copo:0,organizador:0})).toThrow()});
 it("calculates quantity and fictional subtotal in integer cents",()=>{
  const state=createSampleOrder(defaultState(),{agenda:2,copo:1,organizador:0},fakeCustomer);
  expect(state.orders[0].subtotalCents).toBe(14470);
  expect(state.orders[0].items).toHaveLength(2);
 });
 it("shares only fictitious product IDs and quantities, never personal data",()=>{
  const order=createSampleOrder(defaultState(),{agenda:1},fakeCustomer).orders[0];
  const token=encodeReference(order);
  const decoded=atob(token);
  expect(decoded).not.toContain(fakeCustomer.name);
  expect(decoded).not.toContain(fakeCustomer.phone);
  expect(decoded).not.toContain(fakeCustomer.street);
  expect(decodeReference(token)?.items[0]).toEqual({id:"agenda",qty:1});
 });
 it("rejects unknown goods and malformed shared references",()=>{
  expect(decodeReference("not-valid")).toBeNull();
  expect(decodeReference(btoa(JSON.stringify({version:1,id:"TESTE-ABCD1234",items:[{id:"nicotine",qty:1}]})))).toBeNull();
 });
 it("allows a second device to read the fictional item list without transmitting customer details",()=>{
  const first=createSampleOrder(defaultState(),{organizador:3},fakeCustomer);
  const share=encodeReference(first.orders[0]);
  const received=importReference(defaultState(),share);
  expect(received.orders[0].items[0]).toMatchObject({id:"organizador",qty:3});
  expect(received.orders[0].customer.name).toBe("Não transmitido");
  expect(received.orders[0].customer.phone).toBeUndefined();
  expect(importReference(received,share).orders).toHaveLength(1);
 });
 it("contains no financial, payment, or inventory movements in shared state",()=>{
  const state=createSampleOrder(defaultState(),{copo:1},fakeCustomer);
  expect(Object.keys(state)).toEqual(["orders"]);
  expect(Object.keys(state.orders[0])).not.toContain("payment");
  expect(Object.keys(state.orders[0])).not.toContain("stock");
 });
});
