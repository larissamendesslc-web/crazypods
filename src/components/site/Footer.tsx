import {Link} from "@tanstack/react-router";
import {useQuery} from "@tanstack/react-query";
import {ArrowUpRight, ShieldCheck, Sparkles, Instagram, ShoppingBag} from "lucide-react";
import {settingsQuery} from "@/lib/queries";
import {themeExperience,normalizeStoreTheme} from "@/lib/theme-experience";
import {Logo} from "./Logo";

export function Footer(){
  const {data:settings}=useQuery(settingsQuery);
  const phone=(settings?.whatsapp||"").replace(/\D/g,"");
  const theme=normalizeStoreTheme(settings?.theme);
  const experience=themeExperience(theme);
  return (
    <footer className="ffm-footer mt-24 border-t pb-28 pt-14" data-heritage-footer="true">
      <div className="ffm-footer-glow" aria-hidden="true"/>
      <div className="mx-auto grid max-w-7xl gap-9 px-5 md:grid-cols-[1.45fr_.8fr_1fr]">
        <div>
          <Logo className="max-w-[230px]"/>
          <p className="ffm-footer-description mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
            {experience.footer} Tecnologia, estilo e descobertas em uma loja feita para surpreender.
          </p>
          <div className="ffm-footer-trust mt-6 inline-flex items-center gap-2 text-xs"><ShieldCheck size={18}/> Seu pedido acompanhado pela sua conta</div>
        </div>
        <div>
          <p className="ffm-footer-heading">EXPLORE</p>
          <nav aria-label="Links do rodapé" className="ffm-footer-links">
            <Link to="/">Início</Link>
            <Link to="/loja" search={{}}>Ver catálogo</Link>
            <Link to="/" hash="marcas">Categorias</Link>
            <Link to="/" hash="como-comprar">Como comprar</Link>
            <Link to="/conta">Minha conta e pedidos</Link>
          </nav>
        </div>
        <div>
          <p className="ffm-footer-heading">FALE COM A CRAZY</p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">Dúvidas sobre produtos ou entregas? Nossa equipe pode ajudar.</p>
          {phone ? <a className="ffm-footer-contact mt-5 inline-flex items-center gap-2" href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer">Atendimento pelo WhatsApp <ArrowUpRight size={17}/></a>
           : <Link to="/conta" className="ffm-footer-contact mt-5 inline-flex items-center gap-2">Acompanhar pedidos <ArrowUpRight size={17}/></Link>}
        </div>
      </div>
      <div className="ffm-footer-bottom mx-auto mt-14 flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 pt-6 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Crazy Pods. Todos os direitos reservados.</span>
        <span className="inline-flex items-center gap-2"><Sparkles size={14}/> Uma experiência Crazy</span>
      </div>
    </footer>
  );
}
