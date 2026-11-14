/** CRAZY ORDERS · demo only. No real products, orders, payments, customer data or business integrations. */
export type SampleProduct = { id:string; name:string; group:string; priceCents:number; stock:number };
export const sampleCatalog:SampleProduct[] = [
 {id:"agenda",name:"Agenda Graphite",group:"Papelaria · exemplo",priceCents:3990,stock:18},
 {id:"copo",name:"Copo Térmico Slate",group:"Acessórios · exemplo",priceCents:6490,stock:12},
 {id:"organizador",name:"Organizador Modular",group:"Escritório · exemplo",priceCents:2890,stock:25}
];
export type DemoItem={id:string;qty:number;name:string;priceCents:number};
export type DemoOrder={
 id:string;items:DemoItem[];subtotalCents:number;createdAt:string;
 customer:{name:string;phone?:string;cep?:string;street?:string;number?:string;district?:string;city:string;state:string;reference?:string}
};
export type DemoState={orders:DemoOrder[]};
export const DEMO_KEY="crazy-orders-native-share-v2";
export const formatBRL=(n:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n/100);
export const defaultState=():DemoState=>({orders:[]});
function assert(condition:boolean,message:string):asserts condition{if(!condition)throw new Error(message);}
export function makeItems(quantities:Record<string,number>):DemoItem[]{
 const items=sampleCatalog.filter(p=>Number(quantities[p.id])>0).map(p=>({id:p.id,name:p.name,priceCents:p.priceCents,qty:Number(quantities[p.id])}));
 assert(items.length>0,"Adicione pelo menos um item de teste.");
 assert(items.every(i=>Number.isSafeInteger(i.qty)&&i.qty>=1&&i.qty<=99),"Quantidade inválida.");
 return items;
}
export function createSampleOrder(state:DemoState,quantities:Record<string,number>,customer:DemoOrder["customer"]):DemoState{
 const items=makeItems(quantities);
 for(const i of items)assert(i.qty<=sampleCatalog.find(p=>p.id===i.id)!.stock,"Quantidade de teste indisponível.");
 const order:DemoOrder={
  id:"TESTE-"+crypto.randomUUID().slice(0,8).toUpperCase(),items,
  subtotalCents:items.reduce((a,i)=>a+i.priceCents*i.qty,0),
  createdAt:new Date().toISOString(),customer
 };
 return {orders:[order,...state.orders]};
}
export type SharedReference={version:1;id:string;items:{id:string;qty:number}[]};
export function encodeReference(order:DemoOrder):string{
 const reference:SharedReference={version:1,id:order.id,items:order.items.map(i=>({id:i.id,qty:i.qty}))};
 return btoa(JSON.stringify(reference));
}
export function decodeReference(value:string):SharedReference|null{
 try{
  if(value.length>2048||!value.length)return null;
  const v:unknown=JSON.parse(atob(value));if(!v||typeof v!=="object")return null;
  const x=v as Partial<SharedReference>;
  if(x.version!==1||typeof x.id!=="string"||!/^TESTE-[A-F0-9]{8}$/.test(x.id)||!Array.isArray(x.items)||x.items.length<1||x.items.length>sampleCatalog.length)return null;
  const seen=new Set<string>();
  for(const i of x.items){
   if(!i||typeof i.id!=="string"||seen.has(i.id)||!sampleCatalog.some(p=>p.id===i.id)||!Number.isInteger(i.qty)||i.qty<1||i.qty>99)return null;
   seen.add(i.id);
  }
  return x as SharedReference;
 }catch{return null;}
}
export function importReference(state:DemoState,value:string):DemoState{
 const ref=decodeReference(value);assert(!!ref,"Link de demonstração inválido.");
 if(state.orders.some(o=>o.id===ref.id))return state;
 const items=ref.items.map(i=>{const p=sampleCatalog.find(p=>p.id===i.id)!;return {id:p.id,name:p.name,priceCents:p.priceCents,qty:i.qty};});
 const order:DemoOrder={
  id:ref.id,items,subtotalCents:items.reduce((sum,i)=>sum+i.priceCents*i.qty,0),createdAt:new Date().toISOString(),
  customer:{name:"Não transmitido",city:"Não transmitido",state:"--"}
 };
 return {orders:[order,...state.orders]};
}
