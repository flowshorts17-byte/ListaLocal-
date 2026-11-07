import Link from "next/link";
import { requireSession } from "@/lib/auth";

export const metadata = { robots: { index: false, follow: false } };

const NAV = [
  { href: "/painel", label: "Resumo" },
  { href: "/painel/loja", label: "Minha loja" },
  { href: "/painel/produtos", label: "Produtos" },
  { href: "/painel/reservas", label: "Reservas e vendas" },
  { href: "/painel/cliques", label: "Cliques" },
];

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  await requireSession(["lojista"], "/painel");
  return (
    <div className="container-page py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sage">Painel do lojista</p>
      <nav aria-label="Painel" className="mt-3 flex gap-1 overflow-x-auto border-b border-sand-200 text-sm">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-ink-soft hover:border-sand-300 hover:text-ink">
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="pt-8">{children}</div>
    </div>
  );
}
