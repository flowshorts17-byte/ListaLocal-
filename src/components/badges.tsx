import type { ProductType } from "@/lib/types";

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "sage" | "accent" | "warn" | "ink" }) {
  const tones = {
    neutral: "bg-sand text-ink-soft border-sand-300",
    sage: "bg-sage-soft text-sage-dark border-sage/20",
    accent: "bg-accent-soft text-accent-dark border-accent/20",
    warn: "bg-warn-soft text-warn border-warn/20",
    ink: "bg-ink text-white border-ink",
  } as const;
  return (
    <span className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[11px] font-medium leading-none ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function ProductTypeBadge({ type }: { type: ProductType }) {
  return type === "local" ? <Badge tone="sage">Loja local</Badge> : <Badge tone="accent">Oferta afiliada</Badge>;
}
