import {CATALOG,freshState,createOrder,findOrder,quoteShipping,acceptQuote,simulatePayment,confirmOrder,cancelOrder,totalRevenue,money,STATUS_LABELS} from './logic.mjs';

// No real orders. In-memory only: reload clears all simulated names, phone numbers, addresses and orders.
let state=freshState();let cart={notebook:1,mug:0,case:0};let tab='client';let checkout=false;let activeId=null;let chosenId=null;
const customerById=new Map();
const $=(selector)=>document.querySelector(selector);
const escapeText=(input)=>String(input??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=(fn)=>{try{fn();$('#notice').hidden=true;}catch(e){$('#notice').textContent=e?.message??'Não foi possível continuar';$('#notice').hidden=false;}};
const xbtn=(action,label,cl='button',disabled=false)=>`<button class="${cl}" type="button" data-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
function head(title,sub,right=''){return `<div class="panel-head"><div><h2>${title}</h2><p class="sub">${sub}</p></div>${right}</div>`;}
function itemLines(order){return order.items.map(i=>`<div class="summary-line"><span>${escapeText(i.name)} × ${i.quantity}</span><b>${money(i.subtotalCents)}</b></div>`).join('');}
function totals(order){return `${itemLines(order)}<div class="summary-line"><span>Subtotal</span><b>${money(order.subtotalCents)}</b></div><div class="summary-line"><span>Frete</span><b>${order.shippingCents===null?'A calcular':money(order.shippingCents)}</b></div><div class="summary-line total"><span>Total estimado</span><strong>${order.totalCents===null?'—':money(order.totalCents)}</strong></div>`;}
function statusTag(order){return `<span class="tag">${STATUS_LABELS[order.status]}</span>`;}
function contactFields(){return `<form id="checkout-form" class="forms" autocomplete="off">
 <div class="field wide"><label for="person">Nome fictício</label><input id="person" name="person" required maxlength="70" placeholder="Ex.: Cliente Exemplo" value="Cliente Exemplo" /></div>
 <div class="field"><label for="phone">Telefone de demonstração</label><input id="phone" name="phone" required inputmode="tel" maxlength="15" placeholder="11999990000" value="11999990000" /></div>
 <div class="field"><label for="cep">CEP fictício</label><input id="cep" name="cep" required inputmode="numeric" maxlength="9" placeholder="00000-000" value="00000-000" /></div>
 <div class="field wide"><label for="street">Rua fictícia</label><input id="street" name="street" required maxlength="100" placeholder="Rua de Exemplo" value="Rua de Exemplo" /></div>
 <div class="field"><label for="number">Número</label><input id="number" name="number" required maxlength="12" placeholder="123" value="123" /></div>
 <div class="field"><label for="district">Bairro</label><input id="district" name="district" required maxlength="65" placeholder="Bairro Exemplo" value="Bairro Exemplo" /></div>
 <div class="field"><label for="city">Cidade</label><input id="city" name="city" required maxlength="65" placeholder="Cidade Exemplo" value="Cidade Exemplo" /></div>
 <div class="field"><label for="state">UF</label><input id="state" name="state" required maxlength="2" pattern="[A-Za-z]{2}" placeholder="SP" value="SP" /></div>
 <div class="field wide"><label for="reference">Complemento / referência (opcional)</label><input id="reference" name="reference" maxlength="80" placeholder="Ponto de referência fictício" /></div>
 <div class="field wide"><p class="sub">Use APENAS informações fictícias. Nenhum dado é enviado ao servidor ou guardado após recarregar.</p><button class="button full" type="submit">Criar pedido de demonstração →</button></div>
 </form>`;}
function client(){
 if(activeId){const o=findOrder(state,activeId);const actions=[];
 if(o.status==='quoted')actions.push(xbtn('accept','✓ Aceitar orçamento'));
 if(o.status==='accepted')actions.push(xbtn('pay','◉ Simular pagamento'));
 if(o.status==='payment_simulated')actions.push(`<p class="sub">O pagamento fictício foi marcado. A conclusão depende do painel administrativo.</p>`);
 if(o.status==='confirmed')actions.push(`<p class="success">✓ Pedido concluído no ambiente de testes. Estoque e saldo fictícios atualizados.</p>`);
 if(!['confirmed','cancelled'].includes(o.status))actions.push(xbtn('cancel','Cancelar simulação','button secondary'));
 return `<div class="grid"><section class="panel">${head('Acompanhamento do pedido','Identificador e evolução da simulação',statusTag(o))}
 <div class="step"><div class="step-n">✓</div><div><b class="mono">${escapeText(o.id)}</b><p class="sub">Código apenas ilustrativo — sem link compartilhável entre dispositivos.</p></div></div>
 <div class="divider"></div>${totals(o)}<div class="actions">${actions.join('')}</div><div class="hint">⚠ Este ambiente não gera cobrança, Pix ou confirmação bancária. Qualquer pagamento aqui é fictício.</div></section>
 <aside class="panel">${head('Jornada do pedido','Acompanhe cada etapa')}
 <ol class="timeline"><li>Pedido de demonstração criado</li><li>${o.shippingCents===null?'Aguardando frete manual':'Frete fictício calculado'}</li><li>${o.acceptedVersion===o.quoteVersion&&o.acceptedVersion!==null?'Orçamento aceito':'Aguardando aceite do orçamento'}</li><li>${o.payment==='simulated_paid'?'Pagamento simulado':'Pagamento de demonstração pendente'}</li><li>${o.status==='confirmed'?'Finalizado no ambiente local':'Aguardando confirmação administrativa'}</li></ol>
 <div class="divider"></div>${xbtn('new','← Novo pedido fictício','button secondary full')}</aside></div>`;
 }
 const chosen=CATALOG.filter(p=>cart[p.id]>0);const subtotal=chosen.reduce((sum,p)=>sum+p.priceCents*cart[p.id],0);
 return `<div class="grid"><section class="panel">${head(checkout?'Dados de demonstração':'Catálogo de testes',checkout?'Informações fictícias — não inclua dados reais':'Produtos sintéticos independentes do catálogo da loja',`<span class="tag">${checkout?'ETAPA 02':'ETAPA 01'}</span>`)}
 ${checkout?contactFields():`<div class="catalog-list">${CATALOG.map(p=>`<article class="product"><div class="product-emoji" aria-hidden="true">${p.emoji}</div><div class="product-info"><b>${p.name}</b><p class="sub">${p.category}</p><span class="price">${money(p.priceCents)}</span></div><div class="qty"><button data-action="minus" data-item="${p.id}" aria-label="Diminuir ${p.name}" ${cart[p.id]<1?'disabled':''}>−</button><b>${cart[p.id]}</b><button data-action="plus" data-item="${p.id}" aria-label="Aumentar ${p.name}" ${cart[p.id]>=state.stock[p.id]?'disabled':''}>+</button></div></article>`).join('')}</div><div class="hint">Este catálogo é totalmente fictício e não está ligado aos produtos da Crazy Pods.</div>`}
 </section><aside class="panel">${head('Resumo do carrinho','Quantidade, subtotal e frete manual')}
 ${chosen.length?chosen.map(p=>`<div class="summary-line"><span>${p.name} × ${cart[p.id]}</span><b>${money(p.priceCents*cart[p.id])}</b></div>`).join(''):'<div class="empty">Nenhum item selecionado.</div>'}
 <div class="summary-line"><span>Frete</span><b>A calcular</b></div><div class="summary-line total"><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
 ${checkout?xbtn('back','← Voltar ao carrinho','button secondary full'):xbtn('checkout','Continuar pedido de teste →','button full',chosen.length===0)}
 <div class="hint">O próximo passo usa uma simulação local de orçamento e aprovação administrativa. Nenhum WhatsApp será acionado.</div></aside></div>`;
}
function admin(){
 const o=chosenId?findOrder(state,chosenId):state.orders[0]??null;
 const revenue=totalRevenue(state);
 return `<div class="stat-grid"><div class="stat"><small>Pedidos de demonstração</small><strong>${state.orders.length}</strong></div><div class="stat accent"><small>Entradas líquidas fictícias</small><strong>${money(revenue)}</strong></div><div class="stat"><small>Pedidos finalizados</small><strong>${state.orders.filter(x=>x.status==='confirmed').length}</strong></div></div>
 <div class="grid"><section class="panel">${head('Gestão de pedidos','Visão demonstrativa, sem autenticação real',`<span class="tag">${state.orders.length} PEDIDOS</span>`)}
 ${state.orders.length?state.orders.map(p=>`<button class="select-order ${o?.id===p.id?'active':''}" data-action="choose" data-id="${p.id}"><span class="mini-flex"><b class="mono">${p.id}</b>${statusTag(p)}</span><span class="sub">${p.items.length} tipo(s) de item · ${p.totalCents===null?'Frete pendente':money(p.totalCents)}</span></button>`).join(''):'<div class="empty"><b>Sem pedidos ainda</b>Abra a aba do cliente para criar um pedido de demonstração.</div>'}
 <div class="divider"></div><h2>Estoque de testes</h2><p class="sub">Esses valores existem apenas nesta aba do navegador.</p>${CATALOG.map(p=>`<div class="summary-line"><span>${p.name}</span><b>${state.stock[p.id]} un.</b></div>`).join('')}
 <div class="divider"></div><h2>Extrato financeiro fictício</h2>${state.ledger.length?state.ledger.map(entry=>`<div class="summary-line"><span class="mono">${entry.orderId} · ${entry.type==='sale'?'Entrada':'Estorno'}</span><b class="${entry.amountCents>=0?'success':'error'}">${money(entry.amountCents)}</b></div>`).join(''):'<p class="sub">Nenhuma movimentação registrada.</p>'}
 </section><aside class="panel">${head(o?`Pedido ${escapeText(o.id)}`:'Detalhes do pedido',o?'Selecione uma ação de teste':'Aguardando pedido',o?statusTag(o):'')}
 ${o?`${totals(o)}<div class="divider"></div><b style="font-size:12px">Destinatário fictício</b><p class="address">${escapeText(customerById.get(o.id)?.person??'Exemplo')} · ${escapeText(customerById.get(o.id)?.city??'Cidade Exemplo')} / ${escapeText(customerById.get(o.id)?.state??'SP')}</p>
 ${['waiting_shipping','quoted','accepted','payment_simulated'].includes(o.status)?`<form id="shipping-form" class="field"><label for="shipping">Frete de teste (R$)</label><input id="shipping" name="shipping" inputmode="decimal" value="${o.shippingCents===null?'12,00':(o.shippingCents/100).toFixed(2).replace('.',',')}" required /><button class="button secondary full" type="submit" style="margin-top:10px">Definir / atualizar frete</button></form>`:''}
 <div class="actions">${o.status==='payment_simulated'?xbtn('confirm','✓ Confirmar venda fictícia'):''}${!['confirmed','cancelled'].includes(o.status)?xbtn('cancel','Cancelar','button danger'):''}${o.status==='confirmed'?xbtn('cancel','Estornar simulação','button danger'):''}</div>
 <div class="divider"></div><h2>Auditoria</h2><ul class="timeline">${state.audit.filter(a=>a.orderId===o.id).map(a=>`<li>${escapeText(a.event.replaceAll('_',' '))}</li>`).join('')}</ul>
 `:'<div class="empty">Nenhum pedido selecionado.</div>'}
 <div class="hint">Administração simulada: sem login, sem servidor ou operações bancárias. A produção exige Supabase isolado, políticas RLS e transações no banco.</div></aside></div>`;
}
function render(){document.querySelectorAll('[data-tab]').forEach(button=>{button.classList.toggle('selected',button.dataset.tab===tab);button.setAttribute('aria-current',button.dataset.tab===tab?'page':'false');});$('#order-count').textContent=String(state.orders.length);$('#content').innerHTML=tab==='client'?client():admin();}
function toggleTab(next){tab=next;render();}
async function copyPreview(){const o=findOrder(state,activeId);const msg=`CRAZY ORDERS · DEMONSTRAÇÃO\nPedido ${o.id}\nSubtotal ${money(o.subtotalCents)}\nFrete ${o.shippingCents===null?'a definir':money(o.shippingCents)}\nATENÇÃO: referência fictícia sem compra ou link público.`;await navigator.clipboard.writeText(msg);}
document.addEventListener('click',event=>{
 const nav=event.target.closest('[data-tab]');if(nav){toggleTab(nav.dataset.tab);return;}
 const target=event.target.closest('[data-action]');if(!target)return;
 const action=target.dataset.action;
 safe(()=>{
  if(action==='plus'||action==='minus'){const id=target.dataset.item;cart[id]=Math.max(0,Math.min(state.stock[id],cart[id]+(action==='plus'?1:-1)));}
  if(action==='checkout')checkout=true;
  if(action==='back')checkout=false;
  if(action==='choose')chosenId=target.dataset.id;
  if(action==='accept')state=acceptQuote(state,activeId);
  if(action==='pay')state=simulatePayment(state,activeId);
  if(action==='confirm')state=confirmOrder(state,chosenId??state.orders[0]?.id);
  if(action==='cancel')state=cancelOrder(state,tab==='client'?activeId:(chosenId??state.orders[0]?.id));
  if(action==='new'){checkout=false;activeId=null;cart={notebook:1,mug:0,case:0};}
 });render();
});
document.addEventListener('submit',event=>{
 const form=event.target;if(!['checkout-form','shipping-form'].includes(form.id))return;event.preventDefault();
 safe(()=>{
  if(form.id==='checkout-form'){
    if(!form.reportValidity())return;
    const data=Object.fromEntries(new FormData(form).entries());
    if(!/^\d{10,11}$/.test(String(data.phone).replace(/\D/g,'')))throw Error('Telefone fictício deve ter 10 ou 11 números');
    if(!/^\d{8}$/.test(String(data.cep).replace(/\D/g,'')))throw Error('CEP fictício deve ter 8 dígitos');
    state=createOrder(state,cart);activeId=state.orders[0].id;chosenId=activeId;customerById.set(activeId,{person:data.person,city:data.city,state:data.state});checkout=false;
  }else{
    if(!form.reportValidity())return;
    const raw=String(new FormData(form).get('shipping')).trim();
    if(!/^\d{1,3}(?:[.,]\d{1,2})?$/.test(raw))throw Error('Informe o frete no formato 12,50');
    const [whole,part='']=raw.replace(',','.').split('.');
    state=quoteShipping(state,chosenId??state.orders[0].id,Number(whole)*100+Number(part.padEnd(2,'0')));
  }
 });render();
});
render();
