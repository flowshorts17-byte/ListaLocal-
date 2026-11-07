import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { ProductGrid } from "@/components/product-card";
import { Badge } from "@/components/badges";
import { EmptyState } from "@/components/notices";
import { getProducts, getStoreBySlug } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { trackingContext } from "@/lib/tracking";
import { formatWhatsappDisplay } from "@/lib/whatsapp";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const s = await getStoreBySlug(slug);
  if (!s) return { title: "Loja não encontrada", robots: { index: false } };
  return {
    title: `${s.name} — ${s.city}/${s.state}`,
    description: (s.description ?? `Produtos da loja ${s.name} em ${s.city}/${s.state}.`).slice(0, 160),
    alternates: { canonical: `/lojas/${s.slug}` },
    robots: s.is_demo ? { index: false, follow: true } : undefined,
  };
}

export default async function StorePage({ params }: Params) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();
  const { items } = await getProducts({ loja: store.id }, 100);
  const categories = Array.from(new Set(items.map((p) => p.category?.name).filter(Boolean))) as string[];

  const ctx = await trackingContext();
  if (!ctx.isBot) {
    after(async () => {
      const supabase = await createClient();
      await supabase?.rpc("log_event", { p_event_type: "store_view", p_store_id: store.id, p_session_id: ctx.sessionId, p_referrer: ctx.referrer, p_path: `/lojas/${store.slug}` });
    });
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: store.name,
    description: store.description ?? undefined,
    image: store.logo_url ?? undefined,
    address: { "@type": "PostalAddress", addressLocality: store.city, addressRegion: store.state, addressCountry: "BR", streetAddress: store.address ?? undefined },
  };

  return (
    <div className="container-page py-10">
      {!store.is_demo && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <header className="flex flex-col gap-6 border-b border-sand-200 pb-8 sm:flex-row sm:items-start">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sand font-display text-3xl">
          {store.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logo_url} alt={`Logotipo de ${store.name}`} className="h-full w-full object-cover" />
          ) : (
            store.name.replace(/^\[.*?\]\s*/, "").charAt(0)
          )}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="sage">Loja local</Badge>
            {store.is_demo && <Badge tone="warn">Demonstração</Badge>}
          </div>
          <h1 className="h-display mt-2 text-3xl sm:text-4xl">{store.name}</h1>
          <p className="mt-1 text-sm text-ink-soft">{store.city}/{store.state}{store.address ? ` · ${store.address}` : ""}</p>
          {store.description && <p className="mt-4 max-w-2xl whitespace-pre-line text-sm leading-relaxed">{store.description}</p>}
          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            {!store.is_demo && (
              <div>
                <dt className="text-xs text-ink-mute">WhatsApp</dt>
                <dd>{formatWhatsappDisplay(store.whatsapp)}</dd>
              </div>
            )}
            {store.instagram && (
              <div>
                <dt className="text-xs text-ink-mute">Instagram</dt>
                <dd><a href={`https://instagram.com/${store.instagram}`} rel="nofollow noopener" target="_blank" className="underline">@{store.instagram}</a></dd>
              </div>
            )}
            {categories.length > 0 && (
              <div>
                <dt className="text-xs text-ink-mute">Categorias</dt>
                <dd>{categories.join(", ")}</dd>
              </div>
            )}
          </dl>
        </div>
      </header>
      <section className="mt-10">
        <h2 className="h-display mb-6 text-2xl">Produtos</h2>
        {items.length ? <ProductGrid products={items} /> : <EmptyState title="Esta loja ainda não publicou produtos" />}
      </section>
    </div>
  );
}
