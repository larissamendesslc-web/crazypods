import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Image as ImageIcon, RotateCcw, Save, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { THEMES } from "@/components/site/ThemeDecor";
import { EditablePicture } from "@/components/admin/HomeVisualEditor";
import { homeDb } from "@/lib/home-design";
import { homeThemeVariantsQuery, type HomeThemeVariant } from "@/lib/theme-variants";
import { normalizeStoreTheme, themeExperience, type StoreTheme } from "@/lib/theme-experience";
import { settingsQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const nullableFields = ["eyebrow", "title", "highlight", "subtitle", "background_url"] as const;
type Field = typeof nullableFields[number];
type TextField = Exclude<Field, "background_url">;

export function ThemeVariantEditor() {
  const {data: settings} = useQuery(settingsQuery);
  const {data: variants=[],isPending,error}=useQuery(homeThemeVariantsQuery);
  const qc=useQueryClient();
  const [selected,setSelected]=useState<StoreTheme>("smoke");
  const [draft,setDraft]=useState<Partial<HomeThemeVariant>>({});
  const [changed,setChanged]=useState(false);
  const [saving,setSaving]=useState(false);

  useEffect(()=>{if(settings?.theme)setSelected(normalizeStoreTheme(settings.theme));},[settings?.theme]);
  const current=useMemo(()=>variants.find(v=>v.theme===selected),[variants,selected]);
  const experience=themeExperience(selected);
  useEffect(()=>{
    setDraft(current ? {...current} : {theme:selected});
    setChanged(false);
  },[current,selected]);
  function setField(field: Field, value: string | null) {
    setDraft(prev=>({...prev,[field]:value || null}));
    setChanged(true);
  }
  async function save() {
    setSaving(true);
    try {
      const payload: Record<string,string|null>={};
      for(const field of nullableFields)payload[field]=(draft[field]||"").trim()||null;
      const {error: saveError}=await homeDb.from("home_theme_variants")
        .update({...payload,updated_at:new Date().toISOString()}).eq("theme",selected);
      if(saveError)throw saveError;
      await qc.invalidateQueries({queryKey:["home","variants"]});
      setChanged(false);
      toast.success("Visual de "+experience.label+" atualizado.");
    }catch(err){toast.error(err instanceof Error?err.message:"Não foi possível salvar o tema.");}
    finally{setSaving(false)}
  }
  if(isPending)return <section className="rounded-2xl border p-5 text-sm text-muted-foreground">Carregando personalização dos temas...</section>;
  if(error)return <section role="alert" className="rounded-2xl border p-5 text-destructive">Falha ao carregar as opções dos temas. Atualize a página.</section>;
  return (
    <section className="mt-10 space-y-5 rounded-3xl border bg-card p-5 sm:p-7" aria-label="Conteúdo independente de cada tema">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.18em] text-primary"><WandSparkles size={15}/>Temas independentes</p>
          <h2 className="font-display text-xl font-black">Personalizar cada temporada</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Natal, Ano-Novo e os outros temas têm títulos e cenários separados.
            Alterar um aqui não modifica os demais nem os pedidos ou produtos.
          </p>
        </div>
        <Button variant="neon" disabled={saving||!changed} onClick={()=>void save()}><Save size={16}/>{saving?"Salvando...":"Salvar este tema"}</Button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Selecionar temporada para editar">
        {THEMES.map(theme=><button type="button" key={theme.id} onClick={()=>setSelected(theme.id)} aria-pressed={selected===theme.id}
          className={`flex items-center gap-2 rounded-xl border p-3 text-left text-xs font-bold transition-colors ${selected===theme.id?"border-primary bg-primary/10":"hover:border-primary/40"}`}>
          <span className="flex h-5 w-7 shrink-0 overflow-hidden rounded-sm">{theme.colors.slice(1).map((c,i)=><i key={i} className="flex-1" style={{background:c}}/>)}</span>
          <span className="min-w-0 flex-1">{theme.name}</span>
          {selected===theme.id&&<Check size={15} className="shrink-0 text-primary"/>}
        </button>)}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {([
            ["eyebrow","Texto superior",90],
            ["title","Título principal",100],
            ["highlight","Destaque do título",75],
          ] as [TextField,string,number][]).map(([field,label,max])=><div className="space-y-1.5" key={field}>
            <Label htmlFor={`variant-${field}`}>{label}</Label>
            <Input id={`variant-${field}`} value={draft[field]??""} maxLength={max}
              placeholder={experience[field]} onChange={e=>setField(field,e.target.value)}/>
          </div>)}
          <div className="space-y-1.5">
            <Label htmlFor="variant-subtitle">Descrição</Label>
            <Textarea id="variant-subtitle" maxLength={260} rows={3}
              value={draft.subtitle??""} placeholder={experience.subtitle}
              onChange={e=>setField("subtitle",e.target.value)}/>
          </div>
          <p className="text-xs text-muted-foreground">
            Campos vazios utilizam o texto padrão desta temporada. O texto geral do Smoke continua no editor da Home.
          </p>
          <Button variant="outline" disabled={saving} onClick={()=>{setDraft({theme:selected});setChanged(true);}}>
            <RotateCcw size={15}/> Restaurar textos e cenário desta temporada
          </Button>
        </div>
        <div className="space-y-4">
          <EditablePicture
            key={selected}
            name={`Cenário exclusivo: ${experience.label}`}
            note="Opcional: substitui o cenário original apenas neste tema. Use uma imagem horizontal. A arte fica separada dos produtos."
            removeDefault={false}
            value={draft.background_url??null}
            onChange={url=>setField("background_url",url)}
          />
          <div className="rounded-xl border bg-background/50 p-3 text-xs">
            <p className="flex items-center gap-2 font-bold text-primary"><ImageIcon size={15}/> Cena atual</p>
            <div className="mt-3 aspect-[5/4] overflow-hidden rounded-xl bg-secondary">
              {draft.background_url || experience.art ? (
                <img src={draft.background_url||experience.art||""} className="h-full w-full object-contain" alt="Prévia da cena selecionada"/>
              ) : (
                <div className="grid h-full place-items-center text-center text-muted-foreground">Cena gráfica original de {experience.label}</div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-xs text-muted-foreground">{changed?"Alterações ainda não publicadas":"Este tema está salvo."}</p>
        <Button variant="neon" disabled={saving||!changed} onClick={()=>void save()}><Save size={16}/> Publicar alterações deste tema</Button>
      </div>
    </section>
  );
}
