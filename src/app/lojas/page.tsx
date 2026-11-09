import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, SetupNotice } from "@/components/notices";
import { getStores } from "@/lib/data";

export const metadata: Metadata = {
  title: "Lojas participantes",
  description: "Diretório de estabelecimentos locais parceiros do Mimoa.",
  alternates: { canonical: "/lojas" },
};

export default async function StoresPage() {
  const stores = await getStores(500);
  const byCity = stores.reduce<Record<string, typeof stores>>((acc, s) => {
    const k = `${s.city}/${s.state}`;
    (acc[k] ??= []).push(s);
    return acc;
  }, {});
  return (
    <div className="container-page py-10">
      <h1 className="h-display text-3xl sm:text-4xl">Lojas participantes</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">Estabelecimentos locais que vendem pelo Mimoa. O contato e a compra são feitos direto com a loja, pelo WhatsApp.</p>
      <div className="mt-6"><SetupNotice /></div>
      <div className="mt-8 space-y-10">
        {Object.keys(byCity).length === 0 && (
          <EmptyState title="Nenhuma loja aprovada ainda" text="Tem um comércio? Cadastre-se gratuitamente." action={{ href: "/cadastro?tipo=lojista", label: "Cadastrar minha loja" }} />
        )}
        {Object.entries(byCity).map(([city, list]) => (
          <section key={city}>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-ink-soft">{city}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((s) => (
                <li key={s.id}>
                  <Link href={`/lojas/${s.slug}`} className="card flex h-full gap-4 p-4 hover:border-sand-300">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-sand font-display text-lg">
                      {s.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.logo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        s.name.replace(/^\[.*?\]\s*/, "").charAt(0)
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">{s.name}</span>
                      {s.description && <span className="line-clamp-2 block text-xs text-ink-soft">{s.description}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
