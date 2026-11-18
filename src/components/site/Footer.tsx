import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t pb-28 pt-14">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-3">
        <div>
          <Logo className="w-56" />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">Sinta o impacto. Os melhores pods, com entrega rápida e atendimento direto.</p>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-display text-xs font-bold uppercase tracking-widest text-primary">Navegue</p>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/loja" search={{}} className="hover:text-foreground">Loja</Link></li>
            <li><Link to="/conta" className="hover:text-foreground">Minha conta</Link></li>
            <li><Link to="/checkout" className="hover:text-foreground">Carrinho</Link></li>
          </ul>
        </div>
        <div className="text-xs text-muted-foreground">
          <p className="mb-3 font-display font-bold uppercase tracking-widest text-destructive">Proibido para menores de 18 anos</p>
          <p>Este produto contém nicotina, substância que causa dependência. Venda exclusiva para maiores de idade.</p>
          <p className="mt-4">© {new Date().getFullYear()} Crazy. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}