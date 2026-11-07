import Link from "next/link";

export function Pagination({ page, total, pageSize, basePath, params }: { page: number; total: number; pageSize: number; basePath: string; params: Record<string, string | undefined> }) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && sp.set(k, v));
    if (p > 1) sp.set("pagina", String(p));
    const s = sp.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return (
    <nav aria-label="Paginação" className="mt-10 flex items-center justify-center gap-3 text-sm">
      {page > 1 && <Link className="btn-ghost btn-sm" href={href(page - 1)}>← Anterior</Link>}
      <span className="text-ink-soft">Página {page} de {pages}</span>
      {page < pages && <Link className="btn-ghost btn-sm" href={href(page + 1)}>Próxima →</Link>}
    </nav>
  );
}
