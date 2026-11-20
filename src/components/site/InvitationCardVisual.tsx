import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Sparkles, ShoppingBag } from "lucide-react";
import type { InvitationCardData, InvitationDraft } from "@/lib/invitation-cards";

export function InvitationCardVisual({card,mode="preview"}:{
  card:InvitationDraft|InvitationCardData;mode?:"preview"|"landing";
}) {
  const content = (
    <>
      <div className="invite-art-halo" aria-hidden="true"/>
      <div className="invite-art-grid" aria-hidden="true"/>
      <div className="invite-art-orb invite-art-orb-one" aria-hidden="true"/>
      <div className="invite-art-orb invite-art-orb-two" aria-hidden="true"/>
      {card.image_url && <img className="invite-art-cover" src={card.image_url} alt="" loading={mode==="landing"?"eager":"lazy"}/>}
      <div className="invite-art-top">
        <span className="invite-art-mark"><Sparkles size={17}/></span>
        <span>CRAZY<span>PODS</span></span>
        <small>PRIVATE ACCESS / EDITION</small>
      </div>
      <div className="invite-art-center">
        {!card.image_url && <div className="invite-art-bag" aria-hidden="true"><ShoppingBag size={92} strokeWidth={1.2}/><span>CRAZY</span></div>}
        <p className="invite-art-eyebrow">{card.eyebrow}</p>
        <h1 className="invite-art-title">{card.title}</h1>
        <p className="invite-art-subtitle">{card.subtitle}</p>
        <div className="invite-art-cta">{card.cta_label}<ArrowUpRight size={19}/></div>
      </div>
      <div className="invite-art-bottom"><span>✦ SINTA O IMPACTO</span><span>CRAZY EXPERIENCE ✦</span></div>
    </>
  );
  return (
    <div className={`invite-card invite-card-${card.theme} ${mode==="landing"?"invite-card-landing":"invite-card-preview"}`} data-invitation-card={card.theme}>
      {mode==="landing" ? <Link to={card.destination} search={card.destination==="/loja"?{}:undefined} className="invite-card-inner" aria-label={`${card.cta_label} — Crazy Pods`}>{content}</Link>
        : <div className="invite-card-inner" aria-label="Prévia do cartão de convite">{content}</div>}
    </div>
  );
}
