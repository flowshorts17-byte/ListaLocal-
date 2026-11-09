import Link from "next/link";
import Image from "next/image";

/** Logotipo do Mimoa. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" aria-label="Mimoa — página inicial" className={`inline-flex items-center ${className}`}>
      <Image src="/mimoa-logo.png" alt="Mimoa" width={600} height={215} priority className="h-11 w-auto" />
    </Link>
  );
}
