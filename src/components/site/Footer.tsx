import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Instagram, Mail, ShieldCheck } from "lucide-react";
import { settingsQuery } from "@/lib/queries";
import { Logo } from "./Logo";

export function Footer() {
  const {data:settings}=useQuery(settingsQuery);
  const phone=(settings?.whatsapp||"").replace(/\D/g,"");
  return (
    <footer className="crazy-site-footer mt-24 border-t pb-28 pt-14">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <Logo className="w-48" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">A essência da Crazy Pods em uma nova experiência. Uma vitrine feita para surpreender — do primeiro clique à sua entrega.</p>
          <div className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-primary"><ShieldCheck size={17}/> Seus pedidos protegidos pela sua conta</div>
        </div>
        <div className="text-sm">
          <p className="mb-4 font-display text-xs font-bold uppercase tracking-widest text-primary">Navegue</p>
          <ul className="space-y-3 text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">Início</Link></li>
            <li><Link to="/loja" search={{}} className="hover:text-foreground">Loja</Link></li>
            <li><a href="/#destaques" className="hover:text-foreground">Destaques</a></li>
            <li><Link to="/conta" className="hover:text-foreground">Minha conta e pedidos</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-4 font-display text-xs font-bold uppercase tracking-widest text-primary">Fale com a Crazy</p>
          <p className="max-w-xs text-muted-foreground">Precisa de ajuda com sua compra? Entre em contato com a equipe da loja.</p>
          {phone&&<a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 font-semibold text-primary">WhatsApp <ArrowUpRight size={16}/></a>}
        </div>
      </div>
      <div className="mx-auto mt-14 flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 pt-6 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Crazy Pods. Todos os direitos reservados.</span>
        <span>Desenvolvido para uma experiência diferente.</span>
      </div>
    </footer>
  );
}
