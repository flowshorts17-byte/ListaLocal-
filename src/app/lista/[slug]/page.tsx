import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ProductImage } from "@/components/product-image";
import { ProductTypeBadge } from "@/components/badges";
import { ActionForm, Honeypot, SubmitButton } from "@/components/forms";
import { EmptyState } from "@/components/notices";
import { PRODUCT_SELECT } from "@/lib/data";
import { trackingContext } from "@/lib/tracking";
import { formatBRL, formatDate } from "@/lib/format";
import { EVENT_TYPE_LABEL } from "@/lib/labels";
import type { GiftList, ItemStatus, ProductWithRelations } from "@/lib/types";
import { reportPurchaseAction, reserveAction } from "../actions";

// listas são pessoais: não indexar
export const metadata: Metadata = { robots: { index: false, follow: false } };

type ItemRow = { id: string; quantity_desired: number; note: string | null; product: ProductWithRelations };

async function load(slug: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from("gift_lists").select("*").eq("slug", slug).maybeSingle();
  if (!data) return null;
  const list = data as GiftList;
  const [{ data: items }, { data: status }] = await Promise.all([
    supabase.from("gift_list_items").select(`id, quantity_desired, note, product:products(${PRODUCT_SELECT})`).eq("gift_list_id", list.id).order("sort_order").order("created_at"),
    supabase.rpc("gift_list_item_status", { p_list_id: list.id }),
  ]);
  return {
    supabase,
    list,
    items: ((items as unknown as ItemRow[]) ?? []).filter((i) => i.product),
    status: new Map(((status as ItemStatus[]) ?? []).map((s) => [s.item_id, s])),
  };
}

export default async function PublicListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = await load(slug);
  if (!res) notFound();
  const { list, items, status } = res;
  const open = list.status === "active";

  const ctx = await trackingContext();
  if (!ctx.isBot) {
    after(async () => {
      const supabase = await createClient();
      await supabase?.rpc("log_event", { p_event_type: "list_view", p_gift_list_id: list.id, p_session_id: ctx.sessionId, p_referrer: ctx.referrer, p_path: `/lista/${slug}` });
    });
  }

  return (
    <div className="container-page py-10">
      <header className="border-b border-sand-200 pb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sage">{EVENT_TYPE_LABEL[list.event_type]}</p>
        <h1 className="h-display mt-3 text-3xl sm:text-5xl">{list.title}</h1>
        <p className="mt-3 text-sm text-ink-soft">
          {list.event_date ? formatDate(list.event_date) : ""}{list.city ? ` · ${list.city}` : ""}
        </p>
        {list.description && <p className="mx-auto mt-4 max-w-xl whitespace-pre-line text-ink-soft">{list.description}</p>}
        {!open && <p className="mx-auto mt-4 max-w-md rounded-md bg-sand p-2 text-sm">Esta lista foi encerrada pelo organizador.</p>}
      </header>

      <div className="mx-auto mt-6 max-w-3xl rounded-md bg-sand p-4 text-xs leading-relaxed text-ink-soft">
        <strong className="text-ink">Como funciona:</strong> itens de <strong>lojas locais</strong> podem ser reservados por 48 horas; a loja entra em contato para
        combinar pagamento e entrega. Itens de <strong>ofertas afiliadas</strong> são comprados no site do marketplace; depois, você pode marcar
        “Já comprei” — essa informação é declarada por você e <strong>não é verificada automaticamente</strong> pelo ListaLocal.
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 && <div className="sm:col-span-2 lg:col-span-3"><EmptyState title="Esta lista ainda não tem itens" /></div>}
        {items.map((i) => {
          const st = status.get(i.id);
          const p = i.product;
          const taken = (st?.reserved_qty ?? 0) + (st?.purchased_qty ?? 0);
          const available = Math.max(0, i.quantity_desired - taken);
          const isLocal = p.product_type === "local";
          return (
            <article key={i.id} className="card flex flex-col overflow-hidden">
              <div className="relative aspect-[4/3] bg-sand">
                <ProductImage src={p.image_url} alt={p.name} sizes="(max-width: 640px) 100vw, 33vw" />
                <div className="absolute left-2 top-2"><ProductTypeBadge type={p.product_type} /></div>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <Link href={`/produto/${p.slug}?lista=${list.id}`} className="font-medium hover:underline">{p.name}</Link>
                <p className="text-xs text-ink-mute">{isLocal ? `${p.store?.name ?? "Loja local"}` : (p.program?.marketplace_name ?? "Marketplace")}</p>
                <p className="mt-2 font-semibold">{formatBRL(p.price_cents)}</p>
                <p className="mt-1 text-xs text-ink-soft">
                  {isLocal
                    ? available > 0
                      ? `Disponível para reserva: ${available} de ${i.quantity_desired}`
                      : "Já reservado"
                    : `Quantidade desejada: ${i.quantity_desired}${st?.reported_qty ? ` · ${st.reported_qty} convidado(s) informaram compra` : ""}`}
                </p>

                <div className="mt-4 space-y-2">
                  {isLocal ? (
                    open && available > 0 ? (
                      <details className="rounded-md border border-sand-200">
                        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-sage-dark">Reservar este presente</summary>
                        <ActionForm action={reserveAction} className="relative space-y-2 p-3">
                          <Honeypot />
                          <input type="hidden" name="item_id" value={i.id} />
                          <input type="hidden" name="slug" value={list.slug} />
                          <input className="input" name="guest_name" placeholder="Seu nome" required minLength={2} maxLength={80} aria-label="Seu nome" />
                          <input className="input" name="guest_phone" placeholder="WhatsApp com DDD" required inputMode="tel" aria-label="WhatsApp com DDD" />
                          <input className="input" name="guest_message" placeholder="Mensagem (opcional)" maxLength={300} aria-label="Mensagem" />
                          <label className="flex items-start gap-2 text-xs text-ink-soft">
                            <input type="checkbox" name="consent" required className="mt-0.5" />
                            <span>Autorizo o envio do meu nome e telefone à loja e ao organizador para esta reserva (<Link href="/privacidade" className="underline">privacidade</Link>).</span>
                          </label>
                          <SubmitButton className="btn-sage w-full" pendingLabel="Reservando…">Confirmar reserva</SubmitButton>
                        </ActionForm>
                      </details>
                    ) : null
                  ) : (
                    <>
                      <a href={`/r/${p.id}?lista=${list.id}`} target="_blank" rel="sponsored nofollow noopener" className="btn-accent w-full">COMPRAR NA LOJA</a>
                      {open && (
                        <details className="rounded-md border border-sand-200">
                          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Já comprei</summary>
                          <ActionForm action={reportPurchaseAction} className="relative space-y-2 p-3" resetOnSuccess>
                            <Honeypot />
                            <input type="hidden" name="item_id" value={i.id} />
                            <input type="hidden" name="slug" value={list.slug} />
                            <input className="input" name="guest_name" placeholder="Seu nome" required minLength={2} maxLength={80} aria-label="Seu nome" />
                            <input className="input" name="guest_message" placeholder="Recado (opcional)" maxLength={300} aria-label="Recado" />
                            <p className="text-xs text-ink-mute">Esta marcação é informada por você e não é verificada pelo ListaLocal. O item continua disponível para outros convidados.</p>
                            <SubmitButton className="btn-ghost w-full" pendingLabel="Enviando…">Informar compra</SubmitButton>
                          </ActionForm>
                        </details>
                      )}
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-10 text-center text-xs text-ink-mute">
        Links “Comprar na loja” são links de afiliado. <Link href="/divulgacao-de-afiliados" className="underline">Entenda</Link>.
      </p>
    </div>
  );
}
