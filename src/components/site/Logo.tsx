import { cn } from "@/lib/utils";
import logo from "@/assets/crazy-logo.jpg.asset.json";
import christmasHat from "@/assets/christmas-hat.png";
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("brand-logo relative inline-block w-40 max-w-full", className)}>
      <img src={logo.url} alt="Crazy Pods" width={512} height={168} decoding="async" className="block h-auto w-full object-contain" />
      <img src={christmasHat} alt="" aria-hidden width={816} height={816} loading="lazy" className="christmas-only logo-hat" />
    </span>
  );
}