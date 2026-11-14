import { useEffect,useState,type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft,ArrowRight,CheckCircle2,Copy,ExternalLink,MessageCircle,Minus,Package,Plus,ShieldCheck,ShoppingBag,Truck,Wallet,ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/shop";
import { sampleCatalog,defaultState,DEMO_KEY,createSampleOrder,changeOrder,makeItems,encodeReference,decodeReference,importReference,formatBRL,demoRevenue,statusLabel,type DemoOrder,type DemoState } from "@/lib/orders-demo";

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
     <a className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-whatsapp px-5 py-3 text-sm font-bold text-white" href={"https://api.whatsapp.com/send?text="+encodeURIComponent("CRAZY ORDERS · DEMONSTRAÇÃO\nReferência: "+created.id+"\n"+referenceUrl+"\nProdutos fictícios. Não é uma compra.")} target="_blank" rel="noreferrer"><WhatsAppIcon className="h-5 w-5"/> Compartilhar referência de teste</a>
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
 const [shipping,setShipping]=useState("12,00");
 const [incoming,setIncoming]=useState("");
 const [working,setWorking]=useState(false);
 const order=state.orders.find(o=>o.id===selected)??state.orders[0];
 const revenue=demoRevenue(state);
 function action(op:"quote"|"accept"|"pay"|"confirm"|"cancel"){
  if(!order)return;
  try{
   let cents: number|undefined;
   if(op==="quote"){if(!/^\d{1,3}([.,]\d{1,2})?$/.test(shipping.trim()))throw new Error("Use um frete como 12,50.");const [major,minor=""]=shipping.replace(",",".").split(".");cents=Number(major)*100+Number(minor.padEnd(2,"0"));}
   const next=changeOrder(state,order.id,op,cents);save(next);
   toast.success(op==="quote"?"Frete fictício registrado.":op==="confirm"?"Teste concluído sem duplicar estoque/receita.":"Status de demonstração atualizado.");
  }catch(e){toast.error(e instanceof Error?e.message:"Operação não permitida.");}
 }
 function importDemo(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setWorking(true);
  try{
   const value=incoming.includes("#ref=")?incoming.split("#ref=")[1].split(/[&#?]/)[0]:incoming.trim();
   const decoded=decodeReference(value);if(!decoded)throw new Error("Referência inválida ou fora do formato de demonstração.");
   save(importReference(state,value));setSelected(decoded.id);setIncoming("");toast.success("Referência fictícia importada.");
  }catch(e){toast.error(e instanceof Error?e.message:"Erro ao importar.");}
  finally{setWorking(false);}
 }
 return <div className="space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><h1 className="font-display text-xl font-bold md:text-2xl">Pedidos · demonstração</h1><DemoBadge/></div><p className="mt-2 text-xs text-muted-foreground">Operações fictícias e independentes do banco, estoque e financeiro da Crazy Pods.</p></div><a href="/pedidos-demo" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-xs font-bold">Ver experiência do cliente <ExternalLink className="h-4 w-4"/></a></div>
  <div className="grid gap-3 md:grid-cols-3">
   {[{label:"Referências locais",value:String(state.orders.length),icon:ClipboardList},{label:"Entradas simuladas",value:formatBRL(revenue),icon:Wallet},{label:"Testes concluídos",value:String(state.orders.filter(o=>o.status==="done").length),icon:CheckCircle2}].map(({label,value,icon:Icon})=><div key={label} className={subtle+" p-5"}><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{label}</span><Icon className="h-4 w-4"/></div><p className="mt-3 font-display text-lg font-bold">{value}</p></div>)}
  </div>
  <div className={subtle+" p-5"}>
   <h2 className="font-display text-sm font-bold">Importar referência compartilhada</h2>
   <p className="mb-4 mt-2 text-xs leading-relaxed text-muted-foreground">Cole o link fictício recebido por WhatsApp. Apenas itens e quantidades serão importados; nomes, telefones e endereços não viajam no link.</p>
   <form onSubmit={importDemo} className="flex flex-col gap-2 sm:flex-row"><input className={field+" flex-1"} value={incoming} onChange={e=>setIncoming(e.target.value)} placeholder="https://.../pedidos-demo#ref=..." aria-label="Link de referência fictícia" required/><Button type="submit" variant="commerce" disabled={working||!incoming.trim()}>Importar teste</Button></form>
  </div>
  <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,1fr)]">
   <section className={subtle+" min-w-0 p-5"}><h2 className="font-display text-base font-bold">Solicitações de teste</h2>
    {state.orders.length===0?<div className="mt-6 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground"><Package className="mx-auto mb-3 h-7 w-7"/>Nenhum pedido fictício neste navegador.</div>:
    <div className="mt-4 divide-y divide-border">{state.orders.map(o=><button type="button" key={o.id} onClick={()=>setSelected(o.id)} className={"w-full rounded-lg px-3 py-3 text-left transition hover:bg-secondary "+(order?.id===o.id?"bg-secondary/80":"")}><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-xs font-bold">{o.id}</span><span className="rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground">{statusLabel[o.status]}</span></div><div className="mt-2 flex justify-between gap-3 text-xs text-muted-foreground"><span>{formatDate(o.createdAt)}</span><span>{formatBRL(o.totalCents??o.subtotalCents)}</span></div></button>)}</div>}
    <h3 className="mt-7 border-t border-border pt-5 text-sm font-bold">Estoque demonstrativo</h3>
    <div className="mt-2 divide-y divide-border">{sampleCatalog.map(p=><div key={p.id} className="flex justify-between gap-3 py-3 text-xs"><span className="text-muted-foreground">{p.name}</span><strong>{state.inventory[p.id]??0} un.</strong></div>)}</div>
   </section>
   <section className={subtle+" min-w-0 p-5"}><h2 className="font-display text-base font-bold">Atendimento</h2>
    {order?<><div className="mt-5 flex flex-wrap items-center justify-between gap-2"><p className="font-mono text-xs font-bold">{order.id}</p><span className="text-xs text-primary-glow">{statusLabel[order.status]}</span></div>
     <div className="mt-3"><OrderRows order={order}/></div>
     <div className="mt-2 flex justify-between py-2 text-xs"><span>Subtotal</span><strong>{formatBRL(order.subtotalCents)}</strong></div>
     <div className="flex justify-between border-b border-border py-2 text-xs"><span>Frete</span><strong>{order.shippingCents===null?"A combinar":formatBRL(order.shippingCents)}</strong></div>
     <div className="flex justify-between py-4 text-sm font-bold"><span>Total demonstrativo</span><strong>{order.totalCents===null?"—":formatBRL(order.totalCents)}</strong></div>
     <div className="mt-3 rounded-lg border border-border bg-secondary/40 p-4 text-xs">
      <p className="mb-1 font-bold">Dados fictícios disponíveis neste navegador</p>
      <p className="text-muted-foreground">{order.customer.name} · {order.customer.phone??"Telefone não transmitido"}</p>
      <p className="mt-1 text-muted-foreground">{order.customer.street??"Endereço não transmitido"}, {order.customer.number??"s/n"} · {order.customer.district??""} · {order.customer.city}/{order.customer.state}</p>
     </div>
     {!["done","cancelled"].includes(order.status)&&<div className="mt-4">
      <label className="mb-2 block text-xs font-bold" htmlFor="fake-shipping">Frete fictício (R$)</label>
      <div className="flex gap-2"><input id="fake-shipping" className={field+" min-w-0 flex-1"} value={shipping} onChange={e=>setShipping(e.target.value)} inputMode="decimal"/><Button type="button" variant="secondary" onClick={()=>action("quote")}>Definir</Button></div>
      <p className="mt-2 text-xs text-muted-foreground">Orçamento e confirmação são tratados na conversa, fora do site.</p>
     </div>}
     <div className="mt-5 flex flex-col gap-2">
      {order.status==="quoted"&&<Button variant="commerce" onClick={()=>action("accept")}>Registrar aceite informado pelo WhatsApp</Button>}
      {order.status==="accepted"&&<Button variant="commerce" onClick={()=>action("pay")}>Simular pagamento recebido</Button>}
      {order.status==="paid"&&<Button variant="commerce" onClick={()=>action("confirm")}>Concluir operação de teste</Button>}
      {order.status!=="cancelled"&&<Button variant="outline" onClick={()=>action("cancel")}>{order.status==="done"?"Estornar simulação":"Cancelar simulação"}</Button>}
     </div>
    </>:<p className="py-8 text-sm text-muted-foreground">Crie ou importe uma referência fictícia para começar.</p>}
   </section>
  </div>
  <div className={subtle+" flex flex-wrap items-center justify-between gap-3 p-5"}><div><h2 className="text-sm font-bold">Extrato de testes</h2><p className="mt-1 text-xs text-muted-foreground">Lançamentos e estornos são idempotentes apenas no navegador; não representam um banco de produção.</p></div><strong className="font-display text-base">{formatBRL(revenue)}</strong><div className="w-full divide-y divide-border">{state.ledger.map((l,i)=><div key={l.orderId+"-"+i} className="flex justify-between py-2 text-xs"><span>{l.orderId} · {l.type==="sale"?"Entrada fictícia":"Estorno fictício"}</span><span>{formatBRL(l.amountCents)}</span></div>)}</div></div>
 </div>;
}
