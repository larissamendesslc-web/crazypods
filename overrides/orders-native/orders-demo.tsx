import { useEffect,useState,type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft,ArrowRight,CheckCircle2,Copy,ExternalLink,MessageCircle,Minus,Package,Plus,ShieldCheck,ShoppingBag,Truck,Wallet,ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon, useSettings } from "@/components/shop";
import { sampleCatalog,defaultState,DEMO_KEY,createSampleOrder,makeItems,encodeReference,decodeReference,importReference,formatBRL,type DemoOrder,type DemoState } from "@/lib/orders-demo";

function useDemoState(){
 const [state,setState]=useState<DemoState>(defaultState);
 useEffect(()=>{
  try {const raw=localStorage.getItem(DEMO_KEY);if(raw){const saved=JSON.parse(raw) as DemoState;if(Array.isArray(saved?.orders)&&saved.inventory&&Array.isArray(saved.ledger))setState(saved);}}catch{/* use fresh demo */}
  const changed=(e:StorageEvent)=>{if(e.key===DEMO_KEY&&e.newValue){try{setState(JSON.parse(e.newValue) as DemoState);}catch{/* ignore */}}};
  window.addEventListener("storage",changed);
  return()=>window.removeEventListener("storage",changed);
 },[]);
 function save(next:DemoState){
  setState(next);
  try {localStorage.setItem(DEMO_KEY,JSON.stringify(next));}catch{toast.error("Dados de teste não puderam ser salvos neste navegador.");}
 }
 return {state,save};
}
const field="w-full min-h-11 rounded-lg border border-input bg-secondary/70 px-3 py-2.5 text-sm text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";
const subtle="rounded-xl border border-border bg-card";
function formatDate(d:string){try{return new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(new Date(d));}catch{return d;}}
function ItemView({id}:{id:string}){
 return <div className={"relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-gradient-to-br "+(id==="agenda"?"from-zinc-600/40 to-zinc-950":id==="copo"?"from-slate-600/40 to-zinc-950":"from-purple-900/20 to-zinc-950")} aria-hidden="true">
  {id==="agenda"?<div className="h-14 w-10 -rotate-6 rounded-sm border border-zinc-500 border-l-4 border-l-zinc-400 bg-gradient-to-r from-zinc-700 to-zinc-400 shadow-xl"><div className="mx-auto mt-6 h-px w-5 bg-white/60"/></div>:
   id==="copo"?<div className="h-12 w-9 rounded-b-xl rounded-t-md border border-zinc-400 bg-gradient-to-r from-zinc-600 via-zinc-300 to-zinc-600 shadow-xl"/>:
   <div className="h-10 w-14 -rotate-6 rounded-lg border border-slate-500 bg-gradient-to-br from-slate-500 to-slate-800 shadow-xl"><div className="mx-auto mt-5 h-px w-8 bg-white/50"/></div>}
 </div>;
}
function DemoBadge(){return <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-glow"><ShieldCheck className="h-3.5 w-3.5"/> Modo teste</span>;}
function OrderRows({order}:{order:DemoOrder}){
 return <div className="divide-y divide-border">{order.items.map(i=><div key={i.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="text-muted-foreground">{i.name} <span className="font-bold text-foreground">× {i.qty}</span></span><strong className="whitespace-nowrap">{formatBRL(i.priceCents*i.qty)}</strong></div>)}</div>;
}

export function SampleOrdersCustomer(){
 const {state,save}=useDemoState();
 const {WA_NUM}=useSettings();
 const [quantities,setQuantities]=useState<Record<string,number>>({agenda:1,copo:0,organizador:0});
 const [screen,setScreen]=useState<"catalog"|"details"|"created">("catalog");
 const [orderId,setOrderId]=useState<string|null>(null);
 const [shared,setShared]=useState<ReturnType<typeof decodeReference>>(null);
 useEffect(()=>{
  const refresh=()=>{setShared(window.location.hash.startsWith("#ref=")?decodeReference(window.location.hash.substring(5)):null);};
  refresh();window.addEventListener("hashchange",refresh);return()=>window.removeEventListener("hashchange",refresh);
 },[]);
 const chosen=sampleCatalog.filter(p=>(quantities[p.id]??0)>0);
 const subtotal=chosen.reduce((v,p)=>v+p.priceCents*quantities[p.id],0);
 const created=state.orders.find(o=>o.id===orderId);
 function changeQty(id:string,delta:number){
  setQuantities(prev=>({...prev,[id]:Math.max(0,Math.min(sampleCatalog.find(p=>p.id===id)?.stock??0,(prev[id]??0)+delta))}));
 }
 function create(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  const form=e.currentTarget;if(!form.reportValidity())return;
  const data=Object.fromEntries(new FormData(form).entries());
  const get=(key:string)=>String(data[key]??"").trim();
  if(!/^\d{10,11}$/.test(get("phone").replace(/\D/g,"")))return toast.error("Telefone de teste: informe 10 ou 11 números.");
  if(!/^\d{8}$/.test(get("cep").replace(/\D/g,"")))return toast.error("CEP de teste: informe 8 números.");
  try {
   const next=createSampleOrder(state,quantities,{name:get("name"),phone:get("phone"),cep:get("cep"),street:get("street"),number:get("number"),district:get("district"),city:get("city"),state:get("state"),reference:get("reference")});
   save(next);setOrderId(next.orders[0].id);setScreen("created");window.scrollTo({top:0,behavior:"smooth"});
  }catch(error){toast.error(error instanceof Error?error.message:"Erro ao criar pedido fictício");}
 }
 const referenceUrl=created&&typeof window!=="undefined"?window.location.origin+"/pedidos-demo#ref="+encodeReference(created):"";
 async function copy(){
  if(!referenceUrl)return;
  try {await navigator.clipboard.writeText(referenceUrl);toast.success("Link demonstrativo copiado.");}
  catch{toast.error("Não foi possível copiar o link neste navegador.");}
 }
 if(shared){
  const lines=shared.items.map(i=>({p:sampleCatalog.find(p=>p.id===i.id)!,qty:i.qty}));
  return <div className="mx-auto max-w-3xl px-5 py-10 md:py-14">
   <div className="mb-6 flex items-center justify-between gap-3"><h1 className="font-display text-xl font-bold md:text-2xl">Referência do pedido</h1><DemoBadge/></div>
   <section className={subtle+" p-5 md:p-7"}>
    <div className="mb-5 flex items-center gap-3"><ClipboardList className="h-6 w-6 text-primary-glow"/><div><p className="font-display text-lg font-bold">{shared.id}</p><p className="text-xs text-muted-foreground">Consulta somente de itens fictícios</p></div></div>
    <div className="divide-y divide-border">{lines.map(({p,qty})=><div className="flex justify-between gap-4 py-3 text-sm" key={p.id}><span>{p.name} × {qty}</span><strong>{formatBRL(p.priceCents*qty)}</strong></div>)}</div>
    <div className="mt-4 flex justify-between border-t border-border pt-4 font-bold"><span>Subtotal demonstrativo</span><span>{formatBRL(lines.reduce((s,{p,qty})=>s+p.priceCents*qty,0))}</span></div>
    <p className="mt-6 rounded-lg bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">Este link não contém nome, telefone nem endereço. Não representa um pedido real e não sincroniza dados entre dispositivos.</p>
    <Button variant="secondary" className="mt-5 w-full" onClick={()=>{history.replaceState(null,"","/pedidos-demo");setShared(null);}}>Voltar à demonstração</Button>
   </section>
  </div>;
 }
 return <div className="mx-auto max-w-7xl px-5 pb-12">
  <div className="border-b border-border py-8 md:py-11">
   <div className="mb-3 flex flex-wrap items-center gap-3"><Link to="/" className="text-xs text-muted-foreground hover:text-foreground">Início</Link><span className="text-muted-foreground">/</span><span className="text-xs font-semibold">Experiência de pedidos</span><DemoBadge/></div>
   <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{screen==="created"?"Referência criada":screen==="details"?"Dados do pedido":"Experimente o novo pedido"}</h1>
   <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{screen==="created"?"O atendimento continua pelo WhatsApp. Não há acompanhamento de status no site.":"Um fluxo integrado à interface do Crazy Pods, usando somente produtos fictícios e dados de demonstração."}</p>
  </div>
  {screen==="created"&&created?<div className="mx-auto mt-8 grid max-w-4xl gap-5 md:grid-cols-[1.35fr_1fr]">
   <section className={subtle+" p-6 md:p-8"}>
    <CheckCircle2 className="mb-5 h-9 w-9 text-primary-glow"/>
    <h2 className="font-display text-xl font-bold">Referência de teste pronta</h2>
    <p className="mt-2 font-mono text-sm font-bold text-primary-glow">{created.id}</p>
    <p className="my-5 text-sm text-muted-foreground">Compartilhe a referência. A loja poderá responder manualmente no WhatsApp. Nenhum pagamento ou pedido real será processado.</p>
    <OrderRows order={created}/>
    <div className="mt-5 space-y-2">
     <a className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-whatsapp px-5 py-3 text-sm font-bold text-white" href={WA_NUM+encodeURIComponent("CRAZY ORDERS · TESTE\nReferência: "+created.id+"\n"+referenceUrl+"\nSomente dados fictícios. Não é uma compra.")} target="_blank" rel="noreferrer"><WhatsAppIcon className="h-5 w-5"/> Compartilhar referência de teste</a>
     <Button variant="outline" onClick={copy} className="w-full"><Copy className="mr-2 h-4 w-4"/> Copiar link</Button>
    </div>
   </section>
   <aside className={subtle+" h-fit p-6"}>
    <h3 className="font-display text-sm font-bold">Próximos passos</h3>
    <div className="mt-5 space-y-5">{["Envie o link demonstrativo pelo WhatsApp","O responsável consulta a referência e informa o frete na conversa","O registro final é feito no painel de testes"].map((v,i)=><div key={v} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border bg-secondary text-xs font-bold">{i+1}</span><p className="pt-1 text-xs leading-relaxed text-muted-foreground">{v}</p></div>)}</div>
    <p className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">Sem acompanhamento de frete, Pix ou status para o cliente.</p>
    <Button variant="ghost" className="mt-3 w-full" onClick={()=>{setScreen("catalog");setOrderId(null);}}>Nova simulação</Button>
   </aside>
  </div>:<div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)]">
   <section className={subtle+" p-5 md:p-7"}>
    {screen==="details"?<>
     <div className="mb-6 flex items-center justify-between"><div><h2 className="font-display text-lg font-bold">Endereço de demonstração</h2><p className="mt-2 text-xs text-muted-foreground">Preencha somente com informações fictícias; esta versão não recebe dados reais.</p></div><span className="text-xs text-primary-glow">ETAPA 02</span></div>
     <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
      {[
       {id:"name",label:"Nome completo fictício",value:"Cliente Exemplo",wide:true},
       {id:"phone",label:"Telefone de teste",value:"11999990000"},
       {id:"cep",label:"CEP fictício",value:"00000000"},
       {id:"street",label:"Rua fictícia",value:"Rua Demonstração",wide:true},
       {id:"number",label:"Número",value:"100"},
       {id:"district",label:"Bairro fictício",value:"Centro Exemplo"},
       {id:"city",label:"Cidade fictícia",value:"Cidade Exemplo"},
       {id:"state",label:"UF",value:"SP",maxLength:2},
       {id:"reference",label:"Complemento (opcional)",value:"Portaria de teste",wide:true,required:false}
      ].map(f=><label key={f.id} className={"block "+(f.wide?"sm:col-span-2":"")}><span className="mb-2 block text-xs font-bold">{f.label}</span><input name={f.id} className={field} defaultValue={f.value} maxLength={f.maxLength??100} required={f.required!==false} autoComplete="off"/></label>)}
      <div className="sm:col-span-2 mt-2 flex flex-wrap gap-3">
       <Button type="button" variant="secondary" onClick={()=>setScreen("catalog")}><ArrowLeft className="mr-2 h-4 w-4"/> Voltar</Button>
       <Button type="submit" variant="commerce" className="flex-1">Criar referência de teste <ArrowRight className="ml-2 h-4 w-4"/></Button>
      </div>
     </form>
    </>:<>
     <div className="mb-6 flex items-center justify-between gap-3"><div><h2 className="font-display text-lg font-bold">Itens de demonstração</h2><p className="mt-2 text-xs text-muted-foreground">Produtos fictícios, não associados ao estoque do site.</p></div><span className="text-xs text-primary-glow">ETAPA 01</span></div>
     <div className="divide-y divide-border">{sampleCatalog.map(p=><div key={p.id} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"><ItemView id={p.id}/><div className="min-w-0 flex-1"><h3 className="text-sm font-bold">{p.name}</h3><p className="mt-1 text-xs text-muted-foreground">{p.group}</p><p className="mt-2 text-sm font-extrabold">{formatBRL(p.priceCents)}</p></div><div className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-secondary px-1"><button type="button" className="grid h-9 w-8 place-items-center disabled:opacity-40" disabled={!(quantities[p.id]>0)} onClick={()=>changeQty(p.id,-1)} aria-label={"Diminuir "+p.name}><Minus className="h-4 w-4"/></button><span className="w-5 text-center text-sm font-bold">{quantities[p.id]??0}</span><button type="button" className="grid h-9 w-8 place-items-center disabled:opacity-40" disabled={(quantities[p.id]??0)>=p.stock} onClick={()=>changeQty(p.id,1)} aria-label={"Aumentar "+p.name}><Plus className="h-4 w-4"/></button></div></div>)}</div>
    </>}
   </section>
   <aside className={subtle+" h-fit p-5 lg:sticky lg:top-28 md:p-6"}>
    <div className="flex items-center justify-between gap-3"><h2 className="font-display text-base font-bold">Resumo</h2><ShoppingBag className="h-5 w-5 text-muted-foreground"/></div>
    {chosen.length?<div className="mt-6 divide-y divide-border">{chosen.map(p=><div className="flex items-center justify-between gap-3 py-3 text-sm" key={p.id}><span>{p.name} <b>× {quantities[p.id]}</b></span><span className="shrink-0 font-bold">{formatBRL(p.priceCents*quantities[p.id])}</span></div>)}</div>:<p className="py-10 text-center text-xs text-muted-foreground">Nenhum item selecionado.</p>}
    <div className="mt-3 flex items-center justify-between border-t border-border py-4"><span className="text-xs text-muted-foreground">Frete</span><span className="text-xs font-bold">A combinar</span></div>
    <div className="flex items-center justify-between border-t border-border py-4"><span className="font-semibold">Subtotal</span><strong className="font-display text-lg">{formatBRL(subtotal)}</strong></div>
    {screen==="catalog"&&<Button variant="commerce" className="mt-2 w-full" disabled={chosen.length===0} onClick={()=>{try{makeItems(quantities);setScreen("details");}catch(e){toast.error(e instanceof Error?e.message:"Carrinho inválido");}}}>Continuar <ArrowRight className="ml-2 h-4 w-4"/></Button>}
    <div className="mt-5 flex items-start gap-2 rounded-lg bg-secondary/60 p-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary-glow"/><p className="text-xs leading-relaxed text-muted-foreground">Modo demonstração. Nenhum pedido real, pagamento ou movimentação de estoque da loja.</p></div>
   </aside>
  </div>}
 </div>;
}

export function SampleOrdersAdmin(){
 const {state,save}=useDemoState();
 const [selected,setSelected]=useState<string|null>(null);
 const [incoming,setIncoming]=useState("");
 const order=state.orders.find(o=>o.id===selected)??state.orders[0];
 function receive(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  try{
   const link=incoming.includes("#ref=")?incoming.split("#ref=")[1]?.split(/[&#?]/)[0]??"":incoming.trim();
   const parsed=decodeReference(link);
   if(!parsed)throw new Error("Referência de teste inválida.");
   save(importReference(state,link));
   setSelected(parsed.id);setIncoming("");
   toast.success("Link de demonstração recebido.");
  }catch(e){toast.error(e instanceof Error?e.message:"Não foi possível ler o link.");}
 }
 return <div className="space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><div className="flex items-center gap-3"><h1 className="font-display text-xl font-bold md:text-2xl">Recebimento de pedidos · teste</h1><DemoBadge/></div><p className="mt-2 text-xs text-muted-foreground">Somente links de produtos fictícios. Sem processamento de pagamentos, estoque ou financeiro.</p></div>
   <a href="/pedidos-demo" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-xs font-bold">Abrir demonstração do cliente <ExternalLink className="h-4 w-4"/></a>
  </div>
  <section className={subtle+" p-5 md:p-6"}>
   <h2 className="font-display text-base font-bold">Consultar link recebido</h2>
   <p className="my-3 text-xs leading-relaxed text-muted-foreground">Cole a referência de teste compartilhada pelo WhatsApp. O link contém apenas os produtos fictícios e suas quantidades; não contém dados pessoais.</p>
   <form onSubmit={receive} className="flex flex-col gap-2 sm:flex-row"><input className={field+" min-w-0 flex-1"} value={incoming} onChange={e=>setIncoming(e.target.value)} placeholder="Cole a referência recebida" aria-label="Link fictício recebido" required/><Button type="submit" variant="commerce" disabled={!incoming.trim()}>Consultar link</Button></form>
  </section>
  <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,1fr)]">
   <section className={subtle+" min-w-0 p-5"}><h2 className="font-display text-base font-bold">Referências de demonstração</h2>
    {state.orders.length===0?<p className="py-8 text-center text-sm text-muted-foreground">Nenhuma referência foi criada ou importada neste navegador.</p>:
     <div className="mt-4 divide-y divide-border">{state.orders.map(o=><button type="button" key={o.id} onClick={()=>setSelected(o.id)} className={"w-full rounded-lg px-3 py-4 text-left transition hover:bg-secondary "+(order?.id===o.id?"bg-secondary/80":"")}><span className="font-mono text-xs font-bold">{o.id}</span><div className="mt-2 flex justify-between gap-4 text-xs text-muted-foreground"><span>{formatDate(o.createdAt)}</span><span>{o.items.length} tipo(s) de item</span></div></button>)}</div>}
   </section>
   <section className={subtle+" min-w-0 p-5"}>
    <h2 className="font-display text-base font-bold">Itens da referência</h2>
    {order?<><p className="mt-4 font-mono text-xs font-bold text-primary-glow">{order.id}</p><div className="mt-4"><OrderRows order={order}/></div><div className="mt-3 flex items-center justify-between border-t border-border py-4 text-sm font-bold"><span>Subtotal fictício</span><strong>{formatBRL(order.subtotalCents)}</strong></div>
     <p className="mt-5 rounded-lg bg-secondary p-4 text-xs leading-relaxed text-muted-foreground">A loja utiliza o link para consulta; qualquer resposta é feita manualmente pelo WhatsApp. Sem cobranças, confirmações de pagamento ou movimentações financeiras no sistema.</p>
    </>:<p className="py-10 text-sm text-muted-foreground">Receba uma referência para consultar os itens fictícios.</p>}
   </section>
  </div>
 </div>;
}
