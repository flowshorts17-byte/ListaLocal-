"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page max-w-xl py-24 text-center">
      <h1 className="h-display text-3xl">Algo deu errado</h1>
      <p className="mt-3 text-ink-soft">Não foi possível carregar esta página agora.</p>
      <button onClick={reset} className="btn-primary mt-6">Tentar novamente</button>
    </div>
  );
}
