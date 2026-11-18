import type { ReactNode } from "react";
export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-black sm:text-3xl">{title}</h1>{sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}</div>
      {action}
    </div>
  );
}
export function Stat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "primary" | "accent" | "danger" }) {
  const c = { default: "", primary: "text-primary", accent: "text-accent", danger: "text-destructive" }[tone];
  return (
    <div className="min-w-0 rounded-3xl border bg-card p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-2 break-words text-xl font-black tabular-nums leading-relaxed sm:text-2xl ${c}`}>{value}</p>
    </div>
  );
}