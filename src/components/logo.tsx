import Link from "next/link";

/** Logotipo tipográfico do Mimoa. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" aria-label="Mimoa — página inicial" className={`inline-flex items-center ${className}`}>
      <span className="font-script text-[2.1rem] leading-none text-sage">Mimoa</span>
    </Link>
  );
}
