import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, MonitorSmartphone, Sparkles, Trash2, WandSparkles, ExternalLink, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { removeBackground, trimAndCompress } from "@/lib/bg-removal";
import { defaultHome, homeDb, homeDesignQuery, homeFeatureCardsQuery, validHomeLink, type HomeDesign, type HomeFeatureCard } from "@/lib/home-design";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Logo } from "@/components/site/Logo";

type ImageKey = "background_url" | "center_image_url" | "left_image_url" | "right_image_url";
const imageFields: { key: ImageKey; label: string; note: string; removeDefault: boolean }[] = [
  { key: "background_url", label: "Cenário da Home", note: "Imagem de fundo, largura recomendada de 1600 px ou mais. O cenário original continua disponível se você remover a imagem.", removeDefault: false },
  { key: "center_image_url", label: "Arte central da vitrine", note: "Destaque principal: remova o fundo e envie um objeto ou ilustração sem precisar ajustar medidas.", removeDefault: true },
  { key: "left_image_url", label: "Arte flutuante esquerda", note: "Ajuste automático dentro da moldura 3D esquerda.", removeDefault: true },
  { key: "right_image_url", label: "Arte flutuante direita", note: "Ajuste automático dentro da moldura 3D direita.", removeDefault: true },
];

async function optimizeBanner(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const factor = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * factor));
    canvas.height = Math.max(1, Math.round(bitmap.height * factor));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Navegador sem suporte ao editor de imagens");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Falha ao otimizar imagem")), "image/webp", .84));
  } finally { bitmap.close(); }
}

function EditablePicture({
  name, value, onChange, removeDefault = true, note, defaultPreview, onProcessingChange,
}: {
  name: string; value: string | null; onChange: (url: string | null) => void;
  note?: string; removeDefault?: boolean; defaultPreview?: string;
  onProcessingChange?: (active: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [removeBg, setRemoveBg] = useState(removeDefault);
  const [processing, setProcessing] = useState<string | null>(null);
  const file = async (chosen: File) => {
    if (!/^image\/(png|jpeg|webp|avif)$/.test(chosen.type)) {
      toast.error("Use PNG, JPG, WebP ou AVIF."); return;
    }
    if (chosen.size > 10 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 10 MB."); return; }
    onProcessingChange?.(true);
    try {
      setProcessing(removeBg ? "Removendo fundo com inteligência artificial..." : "Otimizando imagem...");
      const output = removeBg
        ? await removeBackground(chosen, progress => setProcessing(`Removendo fundo... ${progress}%`))
        : removeDefault ? await trimAndCompress(chosen, 1100) : await optimizeBanner(chosen);
      if (output.size > 10 * 1024 * 1024) throw new Error("Arquivo processado ultrapassou 10 MB");
      setProcessing("Salvando imagem...");
      const objectPath = `home/${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage.from("home-media").upload(objectPath, output, {
        cacheControl: "31536000",
        contentType: "image/webp",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("home-media").getPublicUrl(objectPath);
      if (!data.publicUrl) throw new Error("Falha ao gerar endereço da imagem");
      onChange(data.publicUrl);
      toast.success("Imagem enviada! Clique em Salvar alterações para publicar.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível processar a imagem.");
    } finally { setProcessing(null); onProcessingChange?.(false); }
  };
  return (
    <div className="space-y-3 rounded-2xl border bg-card/80 p-4">
      <div className="flex items-center justify-between gap-3"><p className="text-sm font-bold">{name}</p>
        {value && <Button type="button" size="sm" variant="ghost" aria-label={`Remover imagem ${name}`} disabled={!!processing} onClick={() => onChange(null)}><Trash2 size={16} /> Remover</Button>}
      </div>
      <div className="crazy-editor-thumb crazy-editor-cutout-preview relative flex aspect-[6/4] items-center justify-center overflow-hidden rounded-xl border">
        {value ? <img src={value} alt={`Prévia da imagem enviada: ${name}`} className="h-[90%] w-[90%] object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,.6)]" />
          : defaultPreview ? <img src={defaultPreview} alt={`Ilustração temporária: ${name}`} className="h-[85%] w-[85%] object-contain opacity-90" />
          : <span className="flex flex-col items-center gap-2 text-xs text-muted-foreground"><ImagePlus size={28} strokeWidth={1.4}/>Sem imagem personalizada</span>}
        {processing && <div role="status" className="absolute inset-0 grid place-items-center bg-background/90 p-3 text-center text-sm font-semibold"><div><Loader2 className="mx-auto mb-2 animate-spin text-primary"/>{processing}</div></div>}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{note ?? "A imagem será ajustada automaticamente ao espaço no site."}</p>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/avif" className="sr-only" onChange={event=>{const chosen=event.target.files?.[0];if(chosen)void file(chosen);event.target.value="";}}/>
      <Button type="button" variant="outline" disabled={!!processing} className="w-full" onClick={()=>input.current?.click()}>
        <ImagePlus size={17}/>{value?"Trocar imagem":"Enviar imagem"}
      </Button>
      <label className="flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
        <span className="flex items-center gap-2"><WandSparkles size={17} className="text-primary" /> Remover fundo automaticamente</span>
        <Switch checked={removeBg} onCheckedChange={setRemoveBg} disabled={!!processing}/>
      </label>
    </div>
  );
}

type Panel = "text" | "art" | "cards" | "effects";

export function HomeVisualEditor() {
  const qc = useQueryClient();
  const designQuery = useQuery(homeDesignQuery);
  const cardsQuery = useQuery(homeFeatureCardsQuery);
  const [design, setDesign] = useState<HomeDesign>(defaultHome);
  const [cards, setCards] = useState<HomeFeatureCard[]>([]);
  const [tab, setTab] = useState<Panel>("text");
  const [saving, setSaving] = useState(false);
  const [pendingUploads, setPendingUploads] = useState(0);
  const trackUpload = (active: boolean) => setPendingUploads(n => Math.max(0, n + (active ? 1 : -1)));
  const [changed, setChanged] = useState(false);
  useEffect(()=>{if(designQuery.data){setDesign(designQuery.data);setChanged(false);}},[designQuery.data]);
  useEffect(()=>{if(cardsQuery.data){setCards(cardsQuery.data);setChanged(false);}},[cardsQuery.data]);
  const set = <K extends keyof HomeDesign>(key:K,value:HomeDesign[K])=>{
    setDesign(prev=>({...prev,[key]:value})); setChanged(true);
  };
  const setCard = (slot:number,patch:Partial<HomeFeatureCard>)=>{
    setCards(prev=>prev.map(card=>card.slot===slot?{...card,...patch}:card));setChanged(true);
  };
  const save = async()=>{
    if(pendingUploads>0){toast.error("Aguarde o processamento das imagens antes de publicar.");return;}
    const required=["eyebrow","title","highlight","subtitle","primary_label","secondary_label"] as const;
    if(required.some(k=>!design[k].trim())){toast.error("Preencha os textos principais da Home.");return;}
    if(!validHomeLink(design.primary_link)||!validHomeLink(design.secondary_link)||cards.some(c=>!validHomeLink(c.target_link))){toast.error("Links devem começar com / ou # e apontar para páginas da loja.");return;}
    if(cards.some(card=>card.active && !card.title.trim())){toast.error("Destaques ativados precisam de título.");return;}
    setSaving(true);
    try {
      const {id,updated_at,...data}=design;
      const {error} = await homeDb.from("home_design").update({...data,updated_at:new Date().toISOString()}).eq("id",1).select("id").single();
      if(error)throw error;
      for(const card of cards){
        const {slot,updated_at:ignored,...values}=card;
        void ignored;
        const {error:cardError}=await homeDb.from("home_feature_cards").update({...values,updated_at:new Date().toISOString()}).eq("slot",slot).select("slot").single();
        if(cardError)throw cardError;
      }
      await Promise.all([qc.invalidateQueries({queryKey:["home","design"]}),qc.invalidateQueries({queryKey:["home","cards"]})]);
      setChanged(false);
      toast.success("Novo visual publicado na Home!");
    }catch(err){toast.error(err instanceof Error?err.message:"Falha ao salvar o visual.")}
    finally{setSaving(false)}
  };
  if(designQuery.isPending || cardsQuery.isPending)return <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground"><Loader2 className="animate-spin" size={18}/>Carregando editor da Home...</div>;
  if(designQuery.error || cardsQuery.error)return <p role="alert" className="mt-8 text-sm text-destructive">Não foi possível carregar o editor. Atualize a página; nenhuma alteração foi realizada.</p>;
  return (
    <section className="mt-12 space-y-6 border-t pt-8" aria-label="Personalização da página inicial">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[.23em] text-primary"><Sparkles className="mr-2 inline h-4 w-4"/>CRAZY PODS PREMIUM</p>
          <h2 className="font-display text-xl font-black sm:text-2xl">Visual da Home</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">Tudo editável: 3 artes flutuantes, cenário 3D, textos, botões e quatro cards. Imagens são independentes do catálogo de produtos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={()=>window.open("/","_blank","noopener,noreferrer")}><ExternalLink size={16}/>Ver Home</Button>
          <Button type="button" variant="neon" disabled={saving||pendingUploads>0||!changed} onClick={()=>void save()}><Save size={16}/>{saving?"Salvando...":"Salvar alterações"}</Button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1 rounded-2xl border bg-card p-2" role="tablist" aria-label="Editar conteúdo da Home">
        {([
          {id:"text",name:"Textos e botões"},
          {id:"art",name:"Imagens 3D"},
          {id:"cards",name:"Cards de vitrine"},
          {id:"effects",name:"Fumaça e 3D"},
        ] as const).map(item=><button type="button" role="tab" aria-selected={tab===item.id} key={item.id}
          className={`rounded-xl px-2 py-3 text-xs font-bold transition-colors sm:text-sm ${tab===item.id?"bg-primary text-primary-foreground":"text-muted-foreground hover:bg-secondary"}`}
          onClick={()=>setTab(item.id)}>{item.name}</button>)}
      </div>

      {tab==="text"&&<div className="grid gap-4 rounded-2xl border bg-card/60 p-5 md:grid-cols-2">
        {([
          ["eyebrow","Texto pequeno superior",90],
          ["title","Título principal",100],
          ["highlight","Trecho em destaque (laranja)",75],
          ["primary_label","Texto do botão principal",48],
          ["primary_link","Destino do botão principal",240],
          ["secondary_label","Texto do segundo botão",48],
          ["secondary_link","Destino do segundo botão",240],
          ["center_caption","Legenda da arte central",60],
          ["left_caption","Legenda da arte esquerda",60],
          ["right_caption","Legenda da arte direita",60],
        ] as [keyof HomeDesign,string,number][]).map(([key,label,max])=><div className="space-y-2" key={key}>
          <Label htmlFor={`home-${key}`}>{label}</Label>
          <Input id={`home-${key}`} maxLength={max} value={String(design[key]??"")} onChange={event=>set(key,event.target.value as never)}/>
        </div>)}
        <div className="space-y-2 md:col-span-2"><Label htmlFor="home-subtitle">Descrição da Home</Label>
          <Textarea id="home-subtitle" value={design.subtitle} maxLength={260} rows={3} onChange={e=>set("subtitle",e.target.value)}/>
        </div>
      </div>}

      {tab==="art"&&<>
        <div className="grid gap-4 sm:grid-cols-2">
          {imageFields.map(field=><EditablePicture key={field.key} name={field.label} value={design[field.key]}
            note={field.note} removeDefault={field.removeDefault}
            defaultPreview={field.key==="background_url"?"/crazy-smoke-bag.svg":"/crazy-writing-pen.svg"}
            onProcessingChange={trackUpload}
            onChange={url=>set(field.key,url)}/>)}
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
          <MonitorSmartphone className="h-5 w-5 shrink-0 text-primary"/>
          <p>Os arquivos enviados se adaptam ao desktop e ao celular com <strong>object-fit: contain</strong>. O site preserva a proporção e aplica brilho/sombra sem deformar o objeto. Imagens removidas do layout não apagam produtos.</p>
        </div>
      </>}

      {tab==="cards"&&<div className="grid gap-4 lg:grid-cols-2">
        {cards.map(card=><div key={card.slot} className="space-y-4 rounded-2xl border bg-card/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-sm font-bold">Card {card.slot}</p>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">Mostrar na Home <Switch checked={card.active} onCheckedChange={active=>setCard(card.slot,{active})}/></label>
          </div>
          <EditablePicture name={`Imagem do card ${card.slot}`} value={card.image_url} onProcessingChange={trackUpload} onChange={url=>setCard(card.slot,{image_url:url})}/>
          <div className="space-y-2"><Label htmlFor={`card-title-${card.slot}`}>Título</Label>
            <Input id={`card-title-${card.slot}`} maxLength={80} value={card.title} onChange={e=>setCard(card.slot,{title:e.target.value})} placeholder="Ex.: Uma coleção da sua loja"/></div>
          <div className="space-y-2"><Label htmlFor={`card-desc-${card.slot}`}>Subtítulo</Label>
            <Input id={`card-desc-${card.slot}`} maxLength={140} value={card.subtitle} onChange={e=>setCard(card.slot,{subtitle:e.target.value})} placeholder="Descrição opcional"/></div>
          <div className="space-y-2"><Label htmlFor={`card-link-${card.slot}`}>Link interno</Label>
            <Input id={`card-link-${card.slot}`} value={card.target_link} maxLength={240} onChange={e=>setCard(card.slot,{target_link:e.target.value})} placeholder="/loja"/></div>
          {!card.active&&<p className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 size={14}/>Card oculto para clientes até ser ativado</p>}
        </div>)}
      </div>}

      {tab==="effects"&&<div className="crazy-smoke-controls space-y-6 text-foreground">
        <div className="space-y-2">
          <h3 className="font-display text-lg font-black">Crazy Smoke · Black Edition</h3>
          <p className="text-sm text-muted-foreground">A sacola é parte do cenário. A fumaça se move atrás dos textos e imagens; o tema poderá ser alterado no seletor acima.</p>
        </div>
        <label className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
          <div><strong className="block text-sm">Fumaça no cenário</strong>
            <span className="text-xs text-muted-foreground">Desligar não remove os produtos nem as imagens enviadas.</span></div>
          <Switch checked={design.smoke_enabled} onCheckedChange={v=>set("smoke_enabled",v)} />
        </label>
        <div className="space-y-3">
          <div className="flex items-center justify-between"><Label htmlFor="smoke-intensity">Intensidade visual da fumaça</Label><span className="smoke-value">{design.smoke_intensity}%</span></div>
          <input id="smoke-intensity" type="range" min={0} max={100} step={5} value={design.smoke_intensity}
            disabled={!design.smoke_enabled}
            onChange={e=>set("smoke_intensity",Number(e.target.value))}/>
          <p className="text-xs text-muted-foreground">Recomendado: entre 40% e 70%. O efeito usa transformações CSS leves; respeita a preferência de reduzir movimento.</p>
        </div>
        <div className="space-y-2"><Label htmlFor="smoke-motion">Movimento da cena</Label>
          <select id="smoke-motion" className="h-12 w-full rounded-xl border bg-card px-3 text-sm" value={design.motion_preset}
            onChange={e=>set("motion_preset",e.target.value as HomeDesign["motion_preset"])}>
            <option value="cinematic">Cinematográfico · fumaça lenta e profundidade</option>
            <option value="subtle">Discreto · menos movimento</option>
            <option value="off">Sem movimento · imagem estática</option>
          </select>
        </div>
        <label className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
          <div><strong className="block text-sm">Mostrar duas artes laterais</strong>
            <span className="text-xs text-muted-foreground">Sem imagens enviadas, a mesma caneta ilustrativa aparece como exemplo. Imagens personalizadas são mostradas automaticamente.</span></div>
          <Switch checked={design.show_side_art} onCheckedChange={v=>set("show_side_art",v)}/>
        </label>
        <div className="space-y-3">
          <div className="flex items-center justify-between"><Label htmlFor="hero-art-scale">Tamanho da imagem em destaque</Label><span className="smoke-value">{design.hero_art_scale}%</span></div>
          <input id="hero-art-scale" type="range" min={65} max={125} step={5} value={design.hero_art_scale} onChange={e=>set("hero_art_scale",Number(e.target.value))}/>
          <p className="text-xs text-muted-foreground">A foto recortada recebe profundidade visual, sombra e flutuação. Isso não converte automaticamente uma fotografia em um arquivo 3D.</p>
        </div>
      </div>}

      <div className="crazy-editor-preview rounded-3xl border border-primary/25 bg-[linear-gradient(120deg,#2c1a38,#110c1d_65%)] p-6">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">PRÉVIA DE TEXTO</p>
        <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="mb-3 text-xs font-bold uppercase text-primary">{design.eyebrow}</p>
            <h3 className="font-display text-2xl font-black leading-tight text-white">{design.title}<span className="block text-primary">{design.highlight}</span></h3>
            <p className="mt-3 max-w-lg text-xs leading-relaxed text-muted-foreground">{design.subtitle}</p>
          </div>
          <Logo className="w-32"/>
        </div>
      </div>
      <div className="flex justify-end gap-3">
        {changed&&<span className="self-center text-xs text-muted-foreground">Existem alterações ainda não publicadas</span>}
        <Button variant="neon" disabled={saving||pendingUploads>0||!changed} onClick={()=>void save()}><Save size={16}/>{saving?"Salvando...":"Publicar na Home"}</Button>
      </div>
    </section>
  );
}
