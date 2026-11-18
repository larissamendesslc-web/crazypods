import { Link } from "@tanstack/react-router";
import { ShoppingBag, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/lib/cart";
import { settingsQuery } from "@/lib/queries";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import christmasHat from "@/assets/christmas-hat.png";

export function Header() {
  const cart = useCart();
  const { data: settings } = useQuery(settingsQuery);
  const msg = settings?.announcement || "Entrega rápida • Pagamento via Pix";
  return (
    <header className="sticky top-0 z-50">
      <div className="overflow-hidden bg-primary py-1.5 text-primary-foreground">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap text-[11px] font-bold uppercase tracking-[.25em]">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i}>{msg} ✦</span>
          ))}
        </div>
      </div>
      <div className="glass border-x-0 border-t-0">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4">
          <Link to="/" aria-label="Início" className="shrink-0"><Logo className="w-36 sm:w-40" /></Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold md:flex">
            <Link to="/" className="text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }} activeOptions={{ exact: true }}>Início</Link>
            <Link to="/loja" search={{}} className="text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>Loja</Link>
            <Link to="/conta" className="text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>Minha conta</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/conta" aria-label="Minha conta" className="grid h-10 w-10 place-items-center rounded-full hover:bg-secondary md:hidden"><User className="h-5 w-5" /></Link>
            <Button variant="ghost" size="icon" onClick={() => cart.setOpen(true)} aria-label="Abrir carrinho" className="relative h-10 w-10 rounded-full hover:bg-secondary">
              <img src={christmasHat} alt="" aria-hidden loading="lazy" width={816} height={816} className="christmas-only festive-button-hat" />
              <ShoppingBag className="h-5 w-5" />
              {cart.count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">{cart.count}</span>
              )}
            </Button>
          </div>
        </div>
        <nav className="flex gap-6 overflow-x-auto px-4 pb-2 text-xs font-bold uppercase tracking-wider scrollbar-none md:hidden">
          <Link to="/" className="text-muted-foreground" activeProps={{ className: "text-primary" }} activeOptions={{ exact: true }}>Início</Link>
          <Link to="/loja" search={{}} className="text-muted-foreground" activeProps={{ className: "text-primary" }}>Loja</Link>
          <Link to="/conta" className="text-muted-foreground" activeProps={{ className: "text-primary" }}>Conta</Link>
        </nav>
      </div>
    </header>
  );
}