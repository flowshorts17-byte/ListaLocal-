import Link from "next/link";
import { Logo } from "./logo";
import { getSession } from "@/lib/auth";
import { signOutAction } from "@/app/(auth)/actions";

const NAV = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/lojas", label: "Lojas" },
  { href: "/minhas-listas", label: "Listas de presentes" },
];

export async function SiteHeader() {
  const session = await getSession().catch(() => null);
  const role = session?.profile?.role;

  return (
    <header className="sticky top-0 z-30 border-b border-sand-200 bg-paper/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Principal" className="hidden items-center gap-6 text-sm text-ink-soft md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-ink">
              {n.label}
            </Link>
          ))}
          {role === "lojista" && (
            <Link href="/painel" className="hover:text-ink">
              Painel da loja
            </Link>
          )}
          {role === "admin" && (
            <Link href="/admin" className="hover:text-ink">
              Administração
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {session ? (
            <form action={signOutAction}>
              <button className="btn-ghost btn-sm" type="submit">
                Sair
              </button>
            </form>
          ) : (
            <>
              <Link href="/entrar" className="btn-ghost btn-sm">
                Entrar
              </Link>
              <Link href="/cadastro" className="btn-primary btn-sm hidden sm:inline-flex">
                Criar conta
              </Link>
            </>
          )}
        </div>
      </div>
      <nav aria-label="Principal (celular)" className="container-page flex gap-5 overflow-x-auto pb-2 text-sm text-ink-soft md:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="whitespace-nowrap hover:text-ink">
            {n.label}
          </Link>
        ))}
        {role === "lojista" && <Link href="/painel" className="whitespace-nowrap">Painel</Link>}
        {role === "admin" && <Link href="/admin" className="whitespace-nowrap">Admin</Link>}
      </nav>
    </header>
  );
}
