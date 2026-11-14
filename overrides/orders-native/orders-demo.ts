/** Isolated sample-order engine. All goods, payments, inventory and money are fictional. */
export type SampleProduct = { id: string; name: string; group: string; priceCents: number; stock: number };
export const sampleCatalog: SampleProduct[] = [
 { id:"agenda",name:"Agenda Graphite",group:"Papelaria · exemplo",priceCents:3990,stock:18 },
 { id:"copo",name:"Copo Térmico Slate",group:"Acessórios · exemplo",priceCents:6490,stock:12 },
 { id:"organizador",name:"Organizador Modular",group:"Escritório · exemplo",priceCents:2890,stock:25 },
];
export type DemoItem = { id:string; qty:number; name:string; priceCents:number };
export type OrderStatus = "new"|"quoted"|"accepted"|"paid"|"done"|"cancelled";
export type DemoOrder = { id:string; items:DemoItem[]; subtotalCents:number; shippingCents:number|null; totalCents:number|null; status:OrderStatus; quoteVersion:number; acceptedVersion:number|null; customer:{name:string;city:string;state:string;phone?:string;cep?:string;street?:string;number?:string;district?:string;reference?:string}; createdAt:string };
export type DemoLedger = { orderId:string; amountCents:number; type:"sale"|"reversal" };
export type DemoState = { orders:DemoOrder[]; inventory:Record<string,number>; ledger:DemoLedger[] };
export const DEMO_KEY="crazy-orders-native-lab-v1";
export const formatBRL=(n:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n/100);
export const defaultState=():DemoState=>({orders:[],inventory:Object.fromEntries(sampleCatalog.map(p=>[p.id,p.stock])),ledger:[]});
function assert(condition:boolean,message:string):asserts condition { if(!condition) throw new Error(message); }
export function makeItems(quantities:Record<string,number>):DemoItem[]{
 const items=sampleCatalog.filter(p=>Number(quantities[p.id])>0).map(p=>({id:p.id,name:p.name,priceCents:p.priceCents,qty:Number(quantities[p.id])}));
 assert(items.length>0,"Adicione pelo menos um item de teste.");
 assert(items.every(i=>Number.isSafeInteger(i.qty)&&i.qty>=1&&i.qty<=99),"Quantidade inválida.");
 return items;
}
export function createSampleOrder(state:DemoState,quantities:Record<string,number>,customer:DemoOrder["customer"]):DemoState{
 const items=makeItems(quantities);
 for(const i of items) assert((state.inventory[i.id]??0)>=i.qty,"Estoque demonstrativo insuficiente: "+i.name);
 const order:DemoOrder={
  id:"TESTE-"+crypto.randomUUID().slice(0,8).toUpperCase(),items,
  subtotalCents:items.reduce((acc,i)=>acc+i.priceCents*i.qty,0),shippingCents:null,totalCents:null,
  status:"new",quoteVersion:0,acceptedVersion:null,customer,createdAt:new Date().toISOString()
 };
 return {...state,orders:[order,...state.orders]};
}
export function changeOrder(state:DemoState,id:string,operation:"quote"|"accept"|"pay"|"confirm"|"cancel",shippingCents?:number):DemoState{
 const current=state.orders.find(o=>o.id===id);
 assert(!!current,"Referência não encontrada.");
 const order={...current};
 const inventory={...state.inventory},ledger=[...state.ledger];
 switch(operation){
 case "quote":
  assert(!["done","cancelled"].includes(order.status),"Pedido já finalizado.");
  assert(Number.isSafeInteger(shippingCents)&&shippingCents!==undefined&&shippingCents>=0&&shippingCents<=50000,"Frete deve ser de R$ 0 a R$ 500.");
  order.shippingCents=shippingCents!;
  order.totalCents=order.subtotalCents+shippingCents!;
  order.quoteVersion++;order.acceptedVersion=null;order.status="quoted";break;
 case "accept":
  assert(order.status==="quoted","Informe o frete primeiro.");
  order.acceptedVersion=order.quoteVersion;order.status="accepted";break;
 case "pay":
  assert(order.status==="accepted"&&order.acceptedVersion===order.quoteVersion,"Aprovação do orçamento pendente.");
  order.status="paid";break;
 case "confirm":
  if(order.status==="done")return state;
  assert(order.status==="paid"&&order.acceptedVersion===order.quoteVersion&&order.totalCents!==null,"Pagamento de teste pendente.");
  for(const i of order.items)assert((inventory[i.id]??0)>=i.qty,"Estoque demonstrativo insuficiente.");
  for(const i of order.items)inventory[i.id]-=i.qty;
  ledger.push({orderId:id,amountCents:order.totalCents!,type:"sale"});order.status="done";break;
 case "cancel":
  if(order.status==="cancelled")return state;
  if(order.status==="done"){
   for(const i of order.items)inventory[i.id]=(inventory[i.id]??0)+i.qty;
   ledger.push({orderId:id,amountCents:-order.totalCents!,type:"reversal"});
  }
  order.status="cancelled";break;
 }
 return {orders:state.orders.map(o=>o.id===id?order:o),inventory,ledger};
}
export function demoRevenue(state:DemoState){return state.ledger.reduce((sum,x)=>sum+x.amountCents,0);}
export type SharedReference={version:1;id:string;items:{id:string;qty:number}[]};
export function encodeReference(order:DemoOrder):string{
 const payload:SharedReference={version:1,id:order.id,items:order.items.map(i=>({id:i.id,qty:i.qty}))};
 return btoa(JSON.stringify(payload));
}
export function decodeReference(value:string):SharedReference|null{
 try {
  if(value.length>2048||!value.length)return null;
  const parsed:unknown=JSON.parse(atob(value));
  if(!parsed||typeof parsed!=="object")return null;
  const p=parsed as Partial<SharedReference>;
  if(p.version!==1||typeof p.id!=="string"||!/^TESTE-[A-F0-9]{8}$/.test(p.id)||!Array.isArray(p.items)||p.items.length<1||p.items.length>3)return null;
  const seen=new Set<string>();
  for(const i of p.items){
   if(!i||typeof i.id!=="string"||seen.has(i.id)||!sampleCatalog.some(x=>x.id===i.id)||!Number.isInteger(i.qty)||i.qty<1||i.qty>99)return null;
   seen.add(i.id);
  }
  return p as SharedReference;
 }catch{return null;}
}
export function importReference(state:DemoState,value:string):DemoState{
 const ref=decodeReference(value);
 assert(!!ref,"Link de demonstração inválido.");
 if(state.orders.some(o=>o.id===ref.id))return state;
 const items=ref.items.map(i=>{
  const p=sampleCatalog.find(p=>p.id===i.id)!;
  return {id:p.id,name:p.name,priceCents:p.priceCents,qty:i.qty};
 });
 const order:DemoOrder={
  id:ref.id,items,subtotalCents:items.reduce((sum,i)=>sum+i.priceCents*i.qty,0),
  shippingCents:null,totalCents:null,status:"new",quoteVersion:0,acceptedVersion:null,
  customer:{name:"Não transmitido",city:"Não transmitido",state:"--"},createdAt:new Date().toISOString()
 };
 return {...state,orders:[order,...state.orders]};
}
export const statusLabel:Record<OrderStatus,string>={
 new:"Aguardando frete",quoted:"Frete informado",accepted:"Orçamento aceito",
 paid:"Pagamento simulado",done:"Concluído · teste",cancelled:"Cancelado"
};
