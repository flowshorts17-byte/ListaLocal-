export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="container-page max-w-3xl py-12">
      <h1 className="h-display text-3xl sm:text-4xl">{title}</h1>
      <p className="mt-2 text-xs text-ink-mute">Última atualização: {updated}. Documento-modelo do MVP — recomenda-se revisão jurídica antes do lançamento comercial.</p>
      <div className="mt-8 space-y-5 text-sm leading-relaxed text-ink [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_li]:ml-5 [&_li]:list-disc">{children}</div>
    </article>
  );
}
