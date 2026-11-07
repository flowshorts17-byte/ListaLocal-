import Link from "next/link";
import { ProductGrid } from "@/components/product-card";
import { EmptyState, SectionHeading, SetupNotice } from "@/components/notices";
import { getBanners, getCategories, getFeaturedProducts, getGiftSuggestions, getPopularProducts, getStores } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const sp = await searchParams;
  const [categories, featured, popular, suggestions, stores, banners] = await Promise.all([
    getCategories(),
    getFeaturedProducts(8),
    getPopularProducts(8),
    getGiftSuggestions(4),
    getStores(8),
    getBanners(),
  ]);
  const banner = banners[0];

  return (
    <>
      {sp.erro === "sem-permissao" && (
        <div role="alert" className="container-page pt-4">
          <p className="rounded-md bg-accent-soft px-3 py-2 text-sm text-accent-dark">
            Sua conta não tem acesso a essa área. O painel do lojista é só para contas de loja; administradores usam a página Administração.
          </p>
        </div>
      )}
      {/* Hero */}
      <section className="border-b border-sand-200 bg-sand">
        <div className="container-page grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.25fr_1fr] lg:items-end">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-sage">Encontre. Escolha. Presenteie.</p>
            <h1 className="h-display text-[2.35rem] leading-[1.08] sm:text-5xl lg:text-[3.6rem]">
              O presente certo está mais perto do que você imagina.
            </h1>
            <p className="mt-5 max-w-xl text-base text-ink-soft sm:text-lg">
              Descubra produtos, encontre lojas e monte listas especiais em um só lugar.
            </p>
            <form action="/catalogo" role="search" className="mt-8 flex max-w-xl gap-2">
              <label htmlFor="busca-home" className="sr-only">Buscar produtos</label>
              <input id="busca-home" name="q" className="input h-12 flex-1 text-base" placeholder="Buscar presentes, produtos ou lojas…" />
              <button className="btn-primary h-12 px-5" type="submit">Buscar</button>
            </form>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/catalogo" className="btn-sage">Descobrir produtos</Link>
              <Link href="/minhas-listas" className="btn-ghost">Criar minha lista</Link>
            </div>
          </div>

          {/* Banner principal (gerenciado no painel administrativo) */}
          <aside className="card overflow-hidden">
            {banner ? (
              <Link href={banner.link_url ?? "/catalogo"} className="block">
                {banner.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- imagem livre cadastrada pelo admin
                  <img src={banner.image_url} alt="" className="aspect-[16/9] w-full object-cover" />
                ) : (
                  <div className="aspect-[16/9] w-full bg-[linear-gradient(135deg,var(--color-sage-soft),var(--color-sand-200))]" />
                )}
                <div className="p-5">
                  <p className="font-display text-xl">{banner.title}</p>
                  {banner.subtitle && <p className="mt-1 text-sm text-ink-soft">{banner.subtitle}</p>}
                  {banner.cta_label && <span className="mt-3 inline-block text-sm font-medium text-sage underline-offset-4 hover:underline">{banner.cta_label} →</span>}
                </div>
              </Link>
            ) : (
              <div className="p-6">
                <p className="font-display text-xl">Lojas locais e grandes marketplaces lado a lado</p>
                <p className="mt-2 text-sm text-ink-soft">
                  Compre direto com o comércio da sua cidade pelo WhatsApp ou siga para lojas parceiras. Tudo identificado com clareza.
                </p>
              </div>
            )}
          </aside>
        </div>
      </section>

      <div className="container-page space-y-16 pt-12">
        <SetupNotice />

        {/* Categorias */}
        <section aria-labelledby="h-categorias">
          <SectionHeading title="Categorias" href="/catalogo" linkLabel="Ver catálogo" />
          <h2 id="h-categorias" className="sr-only">Categorias</h2>
          {categories.length ? (
            <ul className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link href={`/categoria/${c.slug}`} className="inline-block rounded-md border border-sand-300 px-4 py-2 text-sm hover:border-ink">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Categorias em breve" />
          )}
        </section>

        {/* Destaques */}
        <section>
          <SectionHeading title="Produtos em destaque" href="/catalogo" />
          {featured.length ? <ProductGrid products={featured} /> : <EmptyState title="Nenhum destaque no momento" text="Os produtos destacados pela curadoria aparecerão aqui." />}
        </section>

        {/* Lojas */}
        <section>
          <SectionHeading title="Lojas participantes" href="/lojas" />
          {stores.length ? (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {stores.map((s) => (
                <li key={s.id}>
                  <Link href={`/lojas/${s.slug}`} className="card flex h-full flex-col p-4 hover:border-sand-300">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-ink-mute">{s.city}/{s.state}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Seja uma das primeiras lojas" text="Cadastre seu estabelecimento e apareça para quem procura presentes na cidade." action={{ href: "/cadastro?tipo=lojista", label: "Cadastrar minha loja" }} />
          )}
        </section>

        {/* Sugestões */}
        <section>
          <SectionHeading title="Sugestões de presentes até R$ 200" href="/catalogo?ordem=preco-asc" />
          {suggestions.length ? <ProductGrid products={suggestions} /> : <EmptyState title="Sugestões em breve" />}
        </section>

        {/* Populares */}
        <section>
          <SectionHeading title="Produtos populares" href="/catalogo" />
          {popular.length ? <ProductGrid products={popular} /> : <EmptyState title="Ainda sem dados de popularidade" text="Esta seção é calculada a partir de visualizações e cliques reais dos últimos 30 dias." />}
        </section>

        {/* Listas */}
        <section className="grid gap-6 rounded-lg bg-sage-soft p-8 sm:grid-cols-[1.5fr_1fr] sm:items-center">
          <div>
            <h2 className="h-display text-2xl">Monte sua lista de presentes</h2>
            <p className="mt-2 text-sm text-ink-soft">
              Chá de bebê, chá de panela, casamento, aniversário ou casa nova. Escolha produtos de lojas locais e de marketplaces,
              compartilhe o link e acompanhe o que já foi reservado.
            </p>
          </div>
          <div className="sm:text-right">
            <Link href="/minhas-listas" className="btn-sage">Criar minha lista</Link>
          </div>
        </section>
      </div>
    </>
  );
}
