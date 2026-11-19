import { cn } from "@/lib/utils";
import christmasHat from "@/assets/christmas-hat.png";

/** Retro CrazyPods wordmark, modernized: no assumptions about the products sold. */
export function Logo({className}:{className?:string}) {
  return (
    <span className={cn("ffm-logo brand-logo relative inline-flex max-w-full items-center gap-2.5",className)}>
      <span aria-hidden="true" className="ffm-logo-mark"><span className="ffm-logo-mark-star">✦</span></span>
      <span className="ffm-logo-wordmark">
        <span className="ffm-logo-name"><b>CRAZY</b><em>PODS</em></span>
        <span className="ffm-logo-baseline">SINTA O IMPACTO</span>
      </span>
      <img src={christmasHat} alt="" aria-hidden="true" loading="lazy" className="christmas-only logo-hat"/>
    </span>
  );
}
