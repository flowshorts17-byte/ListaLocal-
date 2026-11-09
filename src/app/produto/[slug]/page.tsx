import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { ProductImage } from "@/components/product-image";
import { Badge, ProductTypeBadge } from "@/components/badges";
import { ActionForm, SubmitButton } from "@/components/forms";
import { getProductBySlug } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { trackingContext } from "@/lib/tracking";
import { formatBRL, formatDate } from "@/lib/format";
import { AVAILABILITY_LABEL } from "@/lib/labels";
import { SITE_URL } from "@/lib/env";
import { addToListAction } from "@/app/minhas-listas/actions";
import type { GiftList } from "@/lib/types";

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ demo?: string; lista?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Produto não encontrado", robots: { index: false } };
  const desc = (p.description ?? `${p.name} por ${formatBRL(p.price_cents)}.`).slice(0, 160);
  return {
    title: p.name,
    description: desc,
    alternates: { canonical: `/produto/${p.slug}` },
    openGraph: { title: p.name, description: desc, images: p.image_url ? [{ url: p.image_url }] : undefined },
    robots: p.is_demo ? { index: false, follow: true } : undefined,
  };
}

export default async function ProductPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const sp = await searchParams;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const ctx = await trackingContext();
  if (!ctx.isBot) {
    after(async () => {
      const supabase = await createClient();
      await supabase?.rpc("log_event", {
        p_event_type: "product_view",
        p_product_id: product.id,
        p_session_id: ctx.sessionId,
        p_referrer: ctx.referrer,
        p_path: `/produto/${product.slug}`,
      });
    });
  }

  const session = await getSession();
  let myLists: Pick<GiftList, "id" | "title">[] = [];
  if (session) {
    const { data } = await session.supabase.from("gift_lists").select("id,title").eq("owner_id", session.userId).eq("status", "active").order("created_at", { ascending: false });
    myLists = (data as Pick<GiftList, "id" | "title">[]) ?? [];
  }

  const isLocal = product.product_type === "local";
  const listParam = sp.lista && /^[0-9a-f-]{36}$/i.test(sp.lista) ? `?lista=${sp.lista}` : "";
  const buyHref = isLocal ? `/w/${product.id}${listParam}` : `/r/${product.id}${listParam}`;
  const availabilityLabel = AVAILABILITY_LABEL[product.availability];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.image_url ?? undefined,
    category: product.category?.name,
    url: `${SITE_URL}/produto/${product.slug}`,
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: (product.price_cents / 100).toFixed(2),
      availability:
        product.availability === "unavailable" ? "https://schema.org/OutOfStock" : product.availability === "on_request" ? "https://schema.org/PreOrder" : "https://schema.org/InStock",
      seller: { "@type": "Organization", name: isLocal ? product.store?.name : product.program?.marketplace_name },
    },
  };

  return (
    <div className="container-page py-8 sm:py-12">
      {!product.is_demo && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      )}
      <nav aria-label="Trilha" className="mb-6 text-xs text-ink-mute">
        <Link href="/catalogo" className="hover:underline">Catálogo</Link>
        {product.category && (
          <>
            {" / "}
            <Link href={`/categoria/${product.category.slug}`} className="hover:underline">{product.category.name}</Link>
          </>
        )}
      </nav>

      {(product.is_demo || sp.demo) && (
        <p className="mb-6 rounded-md border border-warn/30 bg-warn-soft p-3 text-sm">
          <strong>Produto de demonstração.</strong> Este item é fictício e serve só para visualizar o layout. O botão de compra não abre contato real.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-sand">
          <ProductImage src={product.image_url} alt={product.name} sizes="(max-width: 1024px) 100vw, 50vw" priority />
        </div>

        <div>
          <div className="flex flex-wrap gap-1.5">
            <ProductTypeBadge type={product.product_type} />
            {product.is_featured && <Badge tone="ink">Produto em destaque</Badge>}
          </div>
          <h1 className="h-display mt-3 text-3xl leading-tight sm:text-4xl">{product.name}</h1>
          <p className="mt-4 text-3xl font-semibold">{formatBRL(product.price_cents)}</p>
          <p className="mt-1 text-xs text-ink-mute">
            {isLocal ? "Preço informado pela loja" : "Preço informado no cadastro; pode mudar no site do marketplace"} · atualizado em {formatDate(product.price_updated_at)}
          </p>

          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-ink-soft">{isLocal ? "Loja" : "Marketplace"}</dt>
            <dd>
              {isLocal && product.store ? (
                <Link href={`/lojas/${product.store.slug}`} className="underline-offset-4 hover:underline">{product.store.name}</Link>
              ) : (
                (product.program?.marketplace_name ?? "Marketplace parceiro")
              )}
            </dd>
            {isLocal && product.store && (
              <>
                <dt className="text-ink-soft">Cidade</dt>
                <dd>{product.store.city}/{product.store.state}</dd>
              </>
            )}
            {product.category && (
              <>
                <dt className="text-ink-soft">Categoria</dt>
                <dd>{product.category.name}</dd>
              </>
            )}
            <dt className="text-ink-soft">Disponibilidade</dt>
            <dd>{availabilityLabel}</dd>
          </dl>

          <div className="mt-8 space-y-3">
            {/* links de rastreamento: <a> simples (sem prefetch) */}
            <a
              href={buyHref}
              rel={isLocal ? "nofollow" : "sponsored nofollow noopener"}
              target={isLocal ? undefined : "_blank"}
              className="btn-accent w-full py-3.5 text-base sm:w-auto sm:px-10"
            >
              {isLocal ? "COMPRAR PELO WHATSAPP" : "COMPRAR NA LOJA"}
            </a>
            {isLocal ? (
              <p className="text-xs text-ink-mute">Você será direcionado ao WhatsApp da loja com uma mensagem pronta. O pagamento e a entrega são combinados diretamente com a loja.</p>
            ) : (
              <p className="text-xs text-ink-mute">
                Link de afiliado: você será levado ao site do marketplace e o Mimoa pode receber uma comissão, sem custo extra para você.{" "}
                <Link href="/divulgacao-de-afiliados" className="underline">Saiba mais</Link>.
              </p>
            )}
          </div>

          {product.description && (
            <div className="mt-8 border-t border-sand-200 pt-6">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">Descrição</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{product.description}</p>
            </div>
          )}

          <div className="mt-8 border-t border-sand-200 pt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft">Adicionar à lista de presentes</h2>
            {!session ? (
              <p className="text-sm text-ink-soft">
                <Link href={`/entrar?next=/produto/${product.slug}`} className="underline">Entre</Link> para adicionar este produto a uma lista.
              </p>
            ) : myLists.length === 0 ? (
              <p className="text-sm text-ink-soft">
                Você ainda não tem listas. <Link href="/minhas-listas" className="underline">Criar uma lista</Link>
              </p>
            ) : (
              <ActionForm action={addToListAction} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <input type="hidden" name="product_id" value={product.id} />
                <label htmlFor="list_id" className="sr-only">Lista</label>
                <select id="list_id" name="list_id" className="input sm:max-w-xs">
                  {myLists.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
                </select>
                <SubmitButton className="btn-ghost" pendingLabel="Adicionando…">Adicionar</SubmitButton>
              </ActionForm>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
