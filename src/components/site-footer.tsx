import Link from "next/link";
import { Logo } from "./logo";
import { SITE_SLOGAN } from "@/lib/env";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-sand-200 bg-sand">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-ink-soft">{SITE_SLOGAN}</p>
          <p className="text-xs text-ink-mute">Primeira operação: Santo Augusto, RS.</p>
        </div>
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-soft">Explorar</h2>
          <ul className="space-y-2 text-sm">
            <li><Link href="/catalogo" className="hover:underline">Catálogo</Link></li>
            <li><Link href="/lojas" className="hover:underline">Lojas participantes</Link></li>
            <li><Link href="/minhas-listas" className="hover:underline">Criar lista de presentes</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-soft">Para lojas</h2>
          <ul className="space-y-2 text-sm">
            <li><Link href="/cadastro?tipo=lojista" className="hover:underline">Cadastrar minha loja</Link></li>
            <li><Link href="/painel" className="hover:underline">Painel do lojista</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-soft">Institucional</h2>
          <ul className="space-y-2 text-sm">
            <li><Link href="/termos" className="hover:underline">Termos de uso</Link></li>
            <li><Link href="/privacidade" className="hover:underline">Política de privacidade</Link></li>
            <li><Link href="/cookies" className="hover:underline">Política de cookies</Link></li>
            <li><Link href="/divulgacao-de-afiliados" className="hover:underline">Divulgação de afiliados</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-sand-200">
        <p className="container-page py-4 text-xs text-ink-mute">
          © {new Date().getFullYear()} Mimoa. Alguns links são de afiliados: podemos receber comissão sem custo extra para você.
          O Mimoa não processa pagamentos; as compras são feitas diretamente com as lojas e marketplaces.
        </p>
      </div>
    </footer>
  );
}
