import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/queries";
import { formatBRL } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { cartKey } from "@/lib/cart-math";
import { ProductStage } from "./ProductStage";

export function ProductCard({ product, brand, index = 0 }: { product: Product; brand?: string | undefined; index?: number }) {
  const cart = useCart();
  const out = product.stock <= 0;
  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (product.flavors.length > 1) return; // needs flavor choice → go to page
    const flavor = product.flavors[0] ?? "";
    cart.add({
      key: cartKey(product.id, flavor), product_id: product.id, name: product.name, price: Number(product.price),
      image_url: product.image_url, flavor, quantity: 1, stock: product.stock, accent_color: product.accent_color,
    });
    toast.success(`${product.name} no carrinho`);
  };
  return (
    <Link
      to="/produto/$id"
      params={{ id: product.id }}
      className="store-product group relative flex animate-rise flex-col overflow-hidden rounded-3xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <ProductStage src={product.image_url} alt={product.name} accent={product.accent_color} className="aspect-square" />
      {product.compare_price && Number(product.compare_price) > Number(product.price) && (
        <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase text-accent-foreground">Oferta</span>
      )}
      {out && (
        <span className="absolute left-3 top-3 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase text-muted-foreground">Esgotado</span>
      )}
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        {brand && <span className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">{brand}</span>}
        <h3 className="font-display text-sm font-semibold leading-relaxed sm:text-base">{product.name}</h3>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div className="flex flex-col">
            {product.compare_price && Number(product.compare_price) > Number(product.price) && (
              <span className="text-xs text-muted-foreground line-through">{formatBRL(Number(product.compare_price))}</span>
            )}
            <span className="font-display text-base font-bold sm:text-lg">{formatBRL(Number(product.price))}</span>
          </div>
          {!out && (
            <button
              onClick={quickAdd}
              aria-label="Adicionar ao carrinho"
              className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:rotate-90 active:scale-90"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}