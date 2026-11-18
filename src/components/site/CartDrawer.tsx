import { Link, useRouterState } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { formatBRL } from "@/lib/format";
import { ProductStage } from "./ProductStage";

export function CartDrawer() {
  const cart = useCart();
  return (
    <Sheet open={cart.open} onOpenChange={cart.setOpen}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 border-l bg-background p-0 sm:max-w-md [&>button]:hidden">
        <SheetHeader className="flex-row items-center justify-between border-b p-5">
          <SheetTitle className="font-display text-xl">Seu carrinho <span className="text-primary">({cart.count})</span></SheetTitle>
          <button onClick={() => cart.setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary" aria-label="Fechar"><X className="h-5 w-5" /></button>
        </SheetHeader>
        {cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/40" strokeWidth={1} />
            <p className="text-muted-foreground">Seu carrinho está vazio.</p>
            <Button asChild variant="neon" onClick={() => cart.setOpen(false)}><Link to="/loja" search={{}}>Explorar a loja</Link></Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 space-y-3 overflow-y-auto p-4">
              {cart.items.map((i) => (
                <li key={i.key} className="flex gap-3 rounded-2xl border bg-card p-3">
                  <ProductStage src={i.image_url} alt={i.name} accent={i.accent_color} size="sm" className="h-20 w-20 shrink-0 rounded-xl" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="truncate font-semibold">{i.name}</p>
                    {i.flavor && <p className="text-xs text-muted-foreground">{i.flavor}</p>}
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center rounded-full border">
                        <button className="grid h-8 w-8 place-items-center" onClick={() => cart.update(i.key, i.quantity - 1)} aria-label="Diminuir">
                          {i.quantity === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                        </button>
                        <span className="w-6 text-center text-sm font-bold">{i.quantity}</span>
                        <button className="grid h-8 w-8 place-items-center disabled:opacity-30" disabled={i.quantity >= i.stock} onClick={() => cart.update(i.key, i.quantity + 1)} aria-label="Aumentar"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                      <span className="font-display font-bold">{formatBRL(i.price * i.quantity)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="space-y-4 border-t p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <div className="flex items-end justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-display text-2xl font-bold">{formatBRL(cart.subtotal)}</span>
              </div>
              <Button asChild variant="neon" size="xl" className="w-full" onClick={() => cart.setOpen(false)}>
                <Link to="/checkout">Finalizar compra</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function FloatingCart() {
  const cart = useCart();
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (cart.count === 0 || cart.open || path === "/checkout") return null;
  return (
    <button
      onClick={() => cart.setOpen(true)}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-rise items-center gap-3 rounded-full bg-primary p-2 pr-5 text-primary-foreground shadow-glow md:left-auto md:right-6 md:w-auto md:translate-x-0"
    >
      <span className="relative grid h-11 w-11 place-items-center rounded-full bg-background text-primary">
        <ShoppingBag className="h-5 w-5" />
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">{cart.count}</span>
      </span>
      <span className="flex-1 text-left font-display text-sm font-bold uppercase">Ver carrinho</span>
      <span className="font-display font-bold">{formatBRL(cart.subtotal)}</span>
    </button>
  );
}