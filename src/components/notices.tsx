import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";

export function SetupNotice() {
  if (isSupabaseConfigured()) return null;
  return (
    <div className="rounded-md border border-warn/30 bg-warn-soft p-4 text-sm text-ink">
      <strong>Banco de dados não configurado.</strong> Defina <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
      <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (veja o README) para carregar produtos, lojas e listas.
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: { href: string; label: string } }) {
  return (
    <div className="rounded-lg border border-dashed border-sand-300 bg-sand/50 px-6 py-12 text-center">
      <p className="font-display text-lg text-ink">{title}</p>
      {text && <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{text}</p>}
      {action && (
        <Link href={action.href} className="btn-ghost mt-5">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function SectionHeading({ title, href, linkLabel = "Ver todos" }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h2 className="h-display text-2xl sm:text-[1.7rem]">{title}</h2>
      {href && (
        <Link href={href} className="text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline">
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}
