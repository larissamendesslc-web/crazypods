import { queryOptions } from "@tanstack/react-query";
import { homeDb } from "@/lib/home-design";

export type InvitationTheme = "neon" | "smoke" | "gold";
export type InvitationCardData = {
  id: string; slug: string; eyebrow: string; title: string; subtitle: string;
  cta_label: string; destination: "/" | "/loja"; theme: InvitationTheme;
  image_url: string | null; enabled: boolean; expires_at: string | null;
  created_at: string; updated_at: string;
};

export const INVITE_ORIGIN = "https://crazypods.vercel.app";
export const INVITE_DEFAULT_IMAGE = INVITE_ORIGIN + "/crazy-invitation-cover.png";
export const INVITE_THEMES: { id: InvitationTheme; label: string; description: string }[] = [
  { id: "neon", label: "Crazy RGB", description: "Rosa, roxo e azul vibrantes" },
  { id: "smoke", label: "Crazy Smoke", description: "Preto, laranja e fumaça" },
  { id: "gold", label: "Crazy Gold", description: "Preto e dourado premium" },
];

export const INVITE_SLUG = /^[a-z0-9][a-z0-9-]{2,60}$/;
export function cleanInvitationSlug(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}
export function createInvitationSlug() {
  return "convite-" + crypto.randomUUID().slice(0, 8);
}
export function invitationUrl(slug: string) {
  if (!INVITE_SLUG.test(slug)) throw new Error("Identificador do convite inválido");
  return INVITE_ORIGIN + "/convite/" + slug;
}
export function invitationMessage(card: InvitationCardData) {
  return `✨ ${card.title}\n\n${card.subtitle}\n\n👉 Acesse: ${invitationUrl(card.slug)}`;
}
export function isInvitationPublished(card: InvitationCardData, when = Date.now()) {
  return card.enabled && (!card.expires_at || Date.parse(card.expires_at) > when);
}
export function isInvitationDestination(value: string): value is "/" | "/loja" {
  return value === "/" || value === "/loja";
}

export async function fetchPublicInvitation(slug: string): Promise<InvitationCardData | null> {
  if (!INVITE_SLUG.test(slug)) return null;
  const {data,error} = await homeDb.from("invitation_cards").select("*").eq("slug",slug).maybeSingle();
  if (error) throw error;
  const card = data as InvitationCardData | null;
  return card && isInvitationPublished(card) ? card : null;
}
export const invitationsAdminQuery = queryOptions({
  queryKey:["admin","invitation-cards"],
  queryFn:async (): Promise<InvitationCardData[]>=>{
    const {data,error} = await homeDb.from("invitation_cards").select("*").order("created_at",{ascending:false});
    if (error) throw error;
    return (data??[]) as InvitationCardData[];
  },
  staleTime:20_000,
});

export type InvitationDraft = Pick<InvitationCardData,
  "slug"|"eyebrow"|"title"|"subtitle"|"cta_label"|"destination"|"theme"|"image_url"|"enabled"|"expires_at"> & {id?: string};
export function newInvitationDraft():InvitationDraft {
  return {
    slug:createInvitationSlug(),eyebrow:"CONVITE ESPECIAL",title:"Você está convidado",
    subtitle:"Conheça o universo Crazy Pods e descubra nossa loja.",
    cta_label:"Entrar na loja",destination:"/loja",theme:"neon",
    image_url:null,enabled:true,expires_at:null,
  };
}
export function validateInvitationDraft(draft: InvitationDraft): string | null {
  if (!INVITE_SLUG.test(draft.slug)) return "O link precisa de 3 a 60 caracteres, apenas letras, números e hífens.";
  if (!draft.eyebrow.trim()||draft.eyebrow.length>60) return "Texto superior inválido (até 60 caracteres).";
  if (!draft.title.trim()||draft.title.length>90) return "O título precisa ter até 90 caracteres.";
  if (draft.subtitle.length>220) return "A descrição deve ter no máximo 220 caracteres.";
  if (!draft.cta_label.trim()||draft.cta_label.length>50) return "O botão precisa de um nome de até 50 caracteres.";
  if (!isInvitationDestination(draft.destination)) return "Escolha um destino disponível.";
  if (!INVITE_THEMES.some(t=>t.id===draft.theme)) return "Selecione um tema válido.";
  if (draft.image_url && (!draft.image_url.startsWith("https://")||draft.image_url.length>1500)) return "A imagem precisa ter um endereço HTTPS.";
  if (draft.expires_at && !Number.isFinite(Date.parse(draft.expires_at))) return "Validade inválida.";
  return null;
}
