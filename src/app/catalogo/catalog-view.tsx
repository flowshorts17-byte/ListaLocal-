import Link from "next/link";
import { ProductGrid } from "@/components/product-card";
import { EmptyState, SetupNotice } from "@/components/notices";
import { Pagination } from "@/components/pagination";
import { PAGE_SIZE, getCategories, getCities, getProducts, type CatalogFilters } from "@/lib/data";

export type CatalogSearchParams = { q?: string; categoria?: string; cidade?: string; tipo?: string; ordem?: string; pagina?: string };

export function parseFilters(sp: CatalogSearchParams, forcedCategory?: string): CatalogFilters {
  return {
    q: sp.q?.slice(0, 80) || undefined,
    categoria: forcedCategory ?? (sp.categoria || undefined),
    cidade: sp.cidade?.slice(0, 80) || undefined,
    tipo: sp.tipo === "local" || sp.tipo === "affiliate" ? sp.tipo : undefined,
    ordem: sp.ordem === "preco-asc" || sp.ordem === "preco-desc" ? sp.ordem : "recentes",
    pagina: Math.max(1, Number.parseInt(sp.pagina ?? "1", 10) || 1),
  };
}

export async function CatalogView({ sp, basePath, forcedCategory, title, intro }: { sp: CatalogSearchParams; basePath: string; forcedCategory?: string; title: string; intro?: string }) {
  const filters = parseFilters(sp, forcedCategory);
  const [{ items, total }, categories, cities] = await Promise.all([getProducts(filters), getCategories(), getCities()]);

  return (
    <div className="container-page py-10">
      <h1 className="h-display text-3xl sm:text-4xl">{title}</h1>
      {intro && <p className="mt-2 max-w-2xl text-ink-soft">{intro}</p>}
      <div className="mt-6"><SetupNotice /></div>

      <form action={basePath} className="mt-6 grid grid-cols-2 gap-3 rounded-lg border border-sand-200 bg-sand/60 p-4 sm:grid-cols-3 lg:grid-cols-6" role="search">
        <div className="col-span-2 lg:col-span-2">
          <label htmlFor="q" className="label">Buscar</label>
          <input id="q" name="q" defaultValue={filters.q} className="input" placeholder="Nome do produto" />
        </div>
        {!forcedCategory && (
          <div>
            <label htmlFor="categoria" className="label">Categoria</label>
            <select id="categoria" name="categoria" defaultValue={filters.categoria ?? ""} className="input">
              <option value="">Todas</option>
              {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="cidade" className="label">Cidade</label>
          <select id="cidade" name="cidade" defaultValue={filters.cidade ?? ""} className="input">
            <option value="">Todas</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="tipo" className="label">Tipo</label>
          <select id="tipo" name="tipo" defaultValue={filters.tipo ?? ""} className="input">
            <option value="">Todos</option>
            <option value="local">Loja local</option>
            <option value="affiliate">Oferta afiliada</option>
          </select>
        </div>
        <div>
          <label htmlFor="ordem" className="label">Ordenar</label>
          <select id="ordem" name="ordem" defaultValue={filters.ordem} className="input">
            <option value="recentes">Relevância</option>
            <option value="preco-asc">Menor preço</option>
            <option value="preco-desc">Maior preço</option>
          </select>
        </div>
        <div className="col-span-2 flex items-end gap-2 sm:col-span-3 lg:col-span-6">
          <button className="btn-primary" type="submit">Aplicar filtros</button>
          <Link href={basePath} className="btn-ghost">Limpar</Link>
          <span className="ml-auto text-sm text-ink-soft">{total} {total === 1 ? "produto" : "produtos"}</span>
        </div>
      </form>
      {filters.cidade && <p className="mt-3 text-xs text-ink-mute">O filtro de cidade mostra apenas produtos de lojas locais daquela cidade.</p>}

      <div className="mt-8">
        {items.length ? (
          <ProductGrid products={items} />
        ) : (
          <EmptyState title="Nenhum produto encontrado" text="Tente outros filtros ou remova a busca." action={{ href: basePath, label: "Limpar filtros" }} />
        )}
      </div>
      <Pagination
        page={filters.pagina ?? 1}
        total={total}
        pageSize={PAGE_SIZE}
        basePath={basePath}
        params={{ q: filters.q, categoria: forcedCategory ? undefined : filters.categoria, cidade: filters.cidade, tipo: filters.tipo, ordem: filters.ordem === "recentes" ? undefined : filters.ordem }}
      />
    </div>
  );
}
