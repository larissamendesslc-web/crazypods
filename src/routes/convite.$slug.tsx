import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";
import { fetchPublicInvitation, INVITE_DEFAULT_IMAGE, INVITE_ORIGIN, isInvitationPublished } from "@/lib/invitation-cards";
import { InvitationCardVisual } from "@/components/site/InvitationCardVisual";

export const Route = createFileRoute("/convite/$slug")({
  loader: async ({params}) => fetchPublicInvitation(params.slug),
  head: ({loaderData,params}) => {
    const title = loaderData?.title ?? "Convites — Crazy Pods";
    const description = loaderData?.subtitle ?? "Entre para conhecer nossa loja Crazy Pods.";
    const image = loaderData?.image_url || INVITE_DEFAULT_IMAGE;
    const address = INVITE_ORIGIN + "/convite/" + encodeURIComponent(params.slug);
    return {
      meta: [
        {title: title + " | Crazy Pods"},
        {name:"description",content:description},
        {property:"og:type",content:"website"},
        {property:"og:site_name",content:"Crazy Pods"},
        {property:"og:locale",content:"pt_BR"},
        {property:"og:title",content:title},
        {property:"og:description",content:description},
        {property:"og:image",content:image},
        {property:"og:url",content:address},
        {name:"twitter:card",content:"summary_large_image"},
        {name:"twitter:title",content:title},
        {name:"twitter:description",content:description},
        {name:"twitter:image",content:image},
        ...(!loaderData ? [{name:"robots",content:"noindex,nofollow"}] : []),
      ],
    };
  },
  component: InvitationLanding,
});

function InvitationLanding() {
  const card = Route.useLoaderData();
  if (!card || !isInvitationPublished(card)) {
    return (
      <div className="invite-not-found mx-auto flex max-w-xl flex-col items-center gap-4 px-5 py-24 text-center">
        <Sparkles className="h-10 w-10 text-primary"/>
        <h1 className="font-display text-2xl font-black">Este convite não está disponível</h1>
        <p className="text-sm text-muted-foreground">O link pode ter expirado ou a campanha foi encerrada.</p>
        <Link to="/" className="ffm-button ffm-button-primary">Ir para o site <ArrowRight size={18}/></Link>
      </div>
    );
  }
  return (
    <section className="invite-public-wrap px-4 py-9 sm:py-16" aria-label="Seu convite CrazyPods">
      <div className="invite-landing-label"><Sparkles size={15}/> Você recebeu um convite especial</div>
      <InvitationCardVisual card={card} mode="landing"/>
      <div className="invite-after-card">
        <p><ShieldCheck size={17}/> Link oficial da loja Crazy Pods</p>
        <p><ShoppingBag size={17}/> Entre e conheça os produtos disponíveis</p>
      </div>
    </section>
  );
}
