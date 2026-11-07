import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page max-w-xl py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sage">Erro 404</p>
      <h1 className="h-display mt-3 text-3xl">Página não encontrada</h1>
      <p className="mt-3 text-ink-soft">O endereço pode ter mudado ou o item não está mais disponível.</p>
      <Link href="/catalogo" className="btn-primary mt-6">Ir para o catálogo</Link>
    </div>
  );
}
