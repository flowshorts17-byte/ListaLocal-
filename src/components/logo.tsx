import Link from "next/link";

/** Logotipo tipográfico provisório do ListaLocal. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" aria-label="ListaLocal — página inicial" className={`inline-flex items-baseline gap-0.5 ${className}`}>
      <span className="font-display text-[1.45rem] font-semibold leading-none tracking-tight text-ink">Lista</span>
      <span className="font-display text-[1.45rem] font-normal italic leading-none tracking-tight text-sage">Local</span>
      <span aria-hidden className="ml-0.5 inline-block h-1.5 w-1.5 translate-y-[-2px] rounded-full bg-accent" />
    </Link>
  );
}
