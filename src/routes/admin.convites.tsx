import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Copy, Download, ExternalLink, Instagram, Link2, Plus, Send, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { homeDb } from "@/lib/home-design";
import { adminHead } from "@/lib/admin-head";
import { PageTitle } from "@/components/admin/ui";
import { EditablePicture } from "@/components/admin/HomeVisualEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
 INVITE_THEMES,createInvitationSlug,cleanInvitationSlug,invitationUrl,invitationMessage,
 invitationsAdminQuery,isInvitationPublished,newInvitationDraft,validateInvitationDraft,
 type InvitationCardData,type InvitationDraft,
} from "@/lib/invitation-cards";
import { InvitationCardVisual } from "@/components/site/InvitationCardVisual";
import { downloadInvitationCreative } from "@/lib/invitation-export";

export const Route = createFileRoute("/admin/convites")({
  head:()=>adminHead("Convites e divulgação","Crie cartões de convite e links para divulgar sua loja no Instagram e WhatsApp."),
  component: InvitationsAdmin,
});

function InvitationsAdmin() {
  const qc=useQueryClient();
  const {data:invitations=[],isPending,isError,error}=useQuery(invitationsAdminQuery);
  const [selected,setSelected]=useState(false);
  const [draft,setDraft]=useState<InvitationDraft>(()=>newInvitationDraft());
  const [dirty,setDirty]=useState(true);
  const [busy,setBusy]=useState(false);
  const [processing,setProcessing]=useState(false);
  const live=Boolean(draft.id && !dirty);
  const shareable=live && draft.enabled && (!draft.expires_at || new Date(draft.expires_at).getTime()>Date.now());
  useEffect(()=>{
    const first=invitations[0];
    if(!selected && first){
      setDraft({...first});setDirty(false);setSelected(true);
    }
  },[selected,invitations]);
  function change<K extends keyof InvitationDraft>(key:K,value:InvitationDraft[K]){
    setDraft(prev=>({...prev,[key]:value}));setDirty(true);
  }
  function pick(card:InvitationCardData){setDraft({...card});setSelected(true);setDirty(false);}
  function fresh(){setDraft(newInvitationDraft());setSelected(true);setDirty(true);}
  function duplicate(){
    const copy={...draft};delete copy.id;
    copy.slug=createInvitationSlug();
    copy.title=copy.title.slice(0,90);
    setDraft(copy);setSelected(true);setDirty(true);
    toast.info("Criada uma cópia. Personalize e salve para gerar um novo link.");
  }
  async function save(){
    const issue=validateInvitationDraft(draft);
    if(issue){toast.error(issue);return;}
    setBusy(true);
    try{
      const payload={
        slug:draft.slug,eyebrow:draft.eyebrow.trim(),title:draft.title.trim(),
        subtitle:draft.subtitle.trim(),cta_label:draft.cta_label.trim(),
        destination:draft.destination,theme:draft.theme,image_url:draft.image_url,
        enabled:draft.enabled,expires_at:draft.expires_at,updated_at:new Date().toISOString(),
      };
      if(draft.id){
        const {error:dbError}=await homeDb.from("invitation_cards").update(payload).eq("id",draft.id);
        if(dbError)throw dbError;
      }else{
        const {data:created,error:dbError}=await homeDb.from("invitation_cards").insert(payload).select("id").single();
        if(dbError)throw dbError;
        if(!created?.id)throw new Error("Não foi possível confirmar a criação do convite");
        setDraft(prev=>({...prev,id:created.id}));
      }
      await qc.invalidateQueries({queryKey:["admin","invitation-cards"]});
      setDirty(false);
      toast.success("Convite salvo! O link já está atualizado.");
    }catch(e){
      const msg=e instanceof Error?e.message:String(e);
      toast.error(msg.includes("duplicate")?"Esse identificador de link já está em uso. Escolha outro.":msg);
    }finally{setBusy(false);}
  }
  async function copyLink(){
    if(!shareable)return;
    try{await navigator.clipboard.writeText(invitationUrl(draft.slug));toast.success("Link copiado. Cole no Direct, na bio ou no adesivo de link do Story.");}
    catch{toast.error("Não foi possível copiar. Selecione o endereço manualmente.");}
  }
  async function share(){
    if(!shareable)return;
    const text=invitationMessage(draft as InvitationCardData);
    try{
      if(navigator.share){await navigator.share({title:draft.title,text,url:invitationUrl(draft.slug)});}
      else{await navigator.clipboard.writeText(text);toast.success("Mensagem de convite copiada!");}
    }catch(e){if(e instanceof Error&&e.name!=="AbortError")toast.error("Não foi possível compartilhar.");}
  }
  async function exportImage(shape:"story"|"post"){
    if(!live){toast.error("Salve o convite antes de baixar a imagem.");return;}
    setBusy(true);
    try{await downloadInvitationCreative(draft,shape);toast.success(shape==="story"?"Story gerado! Adicione o link no adesivo do Instagram.":"Arte quadrada gerada!");}
    catch(e){toast.error(e instanceof Error?e.message:"Falha ao exportar a imagem.");}
    finally{setBusy(false);}
  }
  return (
    <div className="space-y-7 pb-16" data-admin-invitations="true">
      <PageTitle title="Convites & divulgação" sub="Crie cartões digitais e links exclusivos para atrair pessoas à sua loja."/>
      <section className="rounded-3xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-xl space-y-1">
            <h2 className="flex items-center gap-2 font-display text-lg font-black"><Share2 size={19} className="text-primary"/> Seus cartões</h2>
            <p className="text-xs leading-relaxed text-muted-foreground">Cada convite tem um endereço único. Você pode editar, duplicar ou desativar quando quiser.</p>
          </div>
          <Button type="button" variant="neon" onClick={fresh}><Plus size={17}/> Criar cartão</Button>
        </div>
        {isPending?<p className="mt-5 text-sm text-muted-foreground">Carregando convites...</p>
         :isError?<p role="alert" className="mt-5 text-sm text-destructive">Não foi possível carregar os convites: {error instanceof Error?error.message:"tente atualizar a página"}</p>
         :invitations.length===0?<p className="mt-5 text-sm text-muted-foreground">Sua primeira campanha está pronta para ser criada.</p>
         :<div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {invitations.map(card=><button type="button" key={card.id} onClick={()=>pick(card)}
            aria-pressed={draft.id===card.id}
            className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-all ${draft.id===card.id?"border-primary bg-primary/10":"border-border hover:border-primary/50"}`}>
            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${isInvitationPublished(card)?"bg-emerald-400":"bg-slate-500"}`}/>
            <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{card.title}</strong><small className="mt-1 block truncate text-xs text-muted-foreground">/convite/{card.slug}</small></span>
            {draft.id===card.id&&<Check size={16} className="shrink-0 text-primary"/>}
          </button>)}
        </div>}
      </section>
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,430px)]">
        <section className="min-w-0 space-y-5 rounded-3xl border bg-card p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="font-display text-lg font-black">{draft.id?"Editar cartão":"Novo cartão de convite"}</h2><p className="mt-1 text-xs text-muted-foreground">As alterações aparecem na prévia antes de publicar.</p></div>
            {draft.id&&<Button type="button" size="sm" variant="outline" onClick={duplicate}><Copy size={15}/> Duplicar</Button>}
          </div>
          <div className="space-y-1.5"><Label htmlFor="invite-slug">Identificador do link</Label>
            <div className="flex min-w-0 items-center overflow-hidden rounded-xl border bg-background">
              <span className="shrink-0 border-r px-3 py-3 text-[11px] text-muted-foreground">/convite/</span>
              <Input id="invite-slug" value={draft.slug} disabled={!!draft.id} maxLength={60} onChange={e=>change("slug",cleanInvitationSlug(e.target.value))}
                className="min-w-0 border-0 text-sm focus-visible:ring-0" placeholder="seu-convite"/>
            </div>
            <p className="text-[11px] text-muted-foreground">O endereço fica fixo depois de criado, para não quebrar links já enviados.</p>
          </div>
          <div className="space-y-1.5"><Label htmlFor="invite-eyebrow">Frase superior</Label>
            <Input id="invite-eyebrow" maxLength={60} value={draft.eyebrow} onChange={e=>change("eyebrow",e.target.value)} placeholder="CONVITE EXCLUSIVO"/>
          </div>
          <div className="space-y-1.5"><Label htmlFor="invite-title">Título do cartão</Label>
            <Input id="invite-title" maxLength={90} value={draft.title} onChange={e=>change("title",e.target.value)} placeholder="Você está convidado"/>
          </div>
          <div className="space-y-1.5"><Label htmlFor="invite-subtitle">Mensagem de apresentação</Label>
            <Textarea id="invite-subtitle" rows={3} maxLength={220} value={draft.subtitle} onChange={e=>change("subtitle",e.target.value)}
              placeholder="Um convite especial para conhecer nossa loja..."/>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="invite-button">Texto do botão</Label>
              <Input id="invite-button" maxLength={50} value={draft.cta_label} onChange={e=>change("cta_label",e.target.value)}/>
            </div>
            <div className="space-y-1.5"><Label htmlFor="invite-destination">Ao tocar no cartão</Label>
              <select id="invite-destination" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={draft.destination}
                onChange={e=>change("destination",e.target.value as "/"|"/loja")}>
                <option value="/loja">Ir para produtos</option><option value="/">Abrir página inicial</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-bold">Escolha a identidade do cartão</p>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Estilo do convite">
              {INVITE_THEMES.map(theme=><button type="button" key={theme.id} onClick={()=>change("theme",theme.id)}
                aria-pressed={draft.theme===theme.id} className={`invite-theme-picker invite-theme-${theme.id} ${draft.theme===theme.id?"invite-theme-selected":""}`}>
                <span className="invite-theme-dot"/><strong>{theme.label}</strong><small>{theme.description}</small>
              </button>)}
            </div>
          </div>
          <EditablePicture name="Banner personalizado (opcional)" removeDefault={false} value={draft.image_url}
            onProcessingChange={setProcessing} onChange={url=>change("image_url",url)}
            note="Envie uma imagem JPG, PNG ou WebP. O sistema otimiza para a vitrine; os textos continuam legíveis sobre a imagem. Use a opção sem remover fundo para banners."/>
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-background/60 p-4">
            <div><Label htmlFor="invite-enabled" className="font-bold">Convite ativo</Label><p className="mt-1 text-xs text-muted-foreground">Se desligar, quem abrir o link verá que o convite foi encerrado.</p></div>
            <Switch id="invite-enabled" checked={draft.enabled} onCheckedChange={v=>change("enabled",v)}/>
          </div>
          <Button type="button" variant="neon" size="lg" className="w-full" disabled={busy||processing||(!dirty&&!!draft.id)} onClick={()=>void save()}>
            <Check size={18}/>{busy?"Salvando...":draft.id?"Salvar alterações":"Criar convite e gerar link"}
          </Button>
        </section>
        <div className="min-w-0 space-y-5">
          <section className="invite-admin-preview-section rounded-3xl border bg-card p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div><p className="text-xs font-extrabold uppercase tracking-widest text-primary">Prévia ao vivo</p><h3 className="mt-1 font-display text-base font-bold">Cartão digital</h3></div>
              <span className="text-[11px] text-muted-foreground">Formato Story</span>
            </div>
            <InvitationCardVisual card={draft}/>
            <p className="mt-3 text-center text-xs text-muted-foreground">O cliente toca no cartão para entrar na loja.</p>
          </section>
          <section className="space-y-4 rounded-3xl border bg-card p-5">
            <h3 className="flex items-center gap-2 font-display text-base font-bold"><Link2 size={17} className="text-primary"/> Link de divulgação</h3>
            {live?
              <div className="min-w-0 overflow-hidden rounded-xl border bg-background px-3 py-3 text-xs">
                <a className="block break-all text-primary underline" href={invitationUrl(draft.slug)} target="_blank" rel="noopener noreferrer">{invitationUrl(draft.slug)}</a>
              </div>
              :<div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">Salve o cartão para gerar um link válido. Alterações não salvas não aparecem para os visitantes.</div>}
            <div className="grid grid-cols-2 gap-2">
              <Button disabled={!shareable} onClick={()=>void copyLink()}><Copy size={16}/> Copiar link</Button>
              <Button disabled={!shareable} variant="outline" onClick={()=>void share()}><Share2 size={16}/> Compartilhar</Button>
              <Button disabled={!live||busy} variant="outline" onClick={()=>void exportImage("story")}><Download size={16}/> Story 9:16</Button>
              <Button disabled={!live||busy} variant="outline" onClick={()=>void exportImage("post")}><Download size={16}/> Post 1:1</Button>
            </div>
            {live&&<a className="inline-flex items-center gap-2 text-xs font-semibold text-primary" href={invitationUrl(draft.slug)} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Visualizar o convite publicado</a>}
            {!draft.enabled&&<p role="status" className="text-xs text-amber-500">O convite está desativado. Ative e salve para compartilhar.</p>}
            <div className="space-y-2 rounded-2xl border bg-background/50 p-4 text-xs leading-relaxed text-muted-foreground">
              <p className="flex items-center gap-2 font-bold text-foreground"><Instagram size={17} className="text-primary"/> Como divulgar no Instagram</p>
              <p>1. Baixe a arte Story. 2. Publique no Instagram. 3. Adicione o link usando o adesivo de link. Você também pode copiar o endereço para a bio ou enviá-lo pelo Direct.</p>
              <p>Posts no feed não possuem link clicável na legenda. A imagem é visual; o link precisa ser compartilhado separadamente.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
