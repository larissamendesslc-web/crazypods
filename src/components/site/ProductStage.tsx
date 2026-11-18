import { cn } from "@/lib/utils";
import { Package } from "lucide-react";
import type { CSSProperties } from "react";

/** Signature Crazy product presentation: glowing stage, floating cut-out, floor shadow. */
export function ProductStage({
  src, alt, accent, size = "md", float = false, className,
}: { src: string | null; alt: string; accent?: string | null | undefined; size?: "sm" | "md" | "lg"; float?: boolean; className?: string | undefined }) {
  const style = { "--stage": accent || undefined } as CSSProperties;
  return (
    <div style={style} className={cn("relative isolate flex items-center justify-center overflow-hidden", className)}>
      <div className="absolute inset-0 -z-10 bg-stage" />
      <div className="absolute bottom-[10%] left-1/2 -z-10 h-[8%] w-[55%] -translate-x-1/2 rounded-[50%] bg-background/80 blur-md" />
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={cn(
            "product-shot relative max-h-full max-w-full object-contain object-center transition-transform duration-500 group-hover:scale-[1.03]",
            size === "sm" && "h-[76%] w-[76%]",
            size === "md" && "h-[80%] w-[80%]",
            size === "lg" && "h-[80%] w-[80%]",
            float && "animate-float",
          )}
        />
      ) : (
        <Package className="h-1/3 w-1/3 text-muted-foreground/40" strokeWidth={1} />
      )}
    </div>
  );
}