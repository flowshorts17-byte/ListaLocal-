import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { ProductTypeBadge } from "@/components/badges";
import { EmptyState } from "@/components/notices";
import { PRODUCT_SELECT } from "@/lib/data";
import { formatBRL, formatDate } from "@/lib/format";
import { PURCHASE_STATUS_LABEL, RESERVATION_STATUS_LABEL } from "@/lib/labels";
import { SITE_URL } from "@/lib/env";
import type { GiftList, ItemStatus, ProductWithRelations, ReservationStatus } from "@/lib/types";
import { addToListAction, removeItemAction, updateItemQtyAction, updateListAction } from "../actions";
import { ListFields } from "../list-form";

export const metadata: Metadata = { title: "Gerenciar lista", robots: { index: false } };

type ItemRow = { id: string; quantity_desired: number; product: ProductWithRelations };

export default async function ManageListPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string }> }) {
  const { id } = await params;
  const { q } = await searchParams;
  const s = await requireSession(undefined, `/minhas-listas/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: listData } = await s.supabase.from("gift_lists").select("*").eq("id", id).eq("owner_id", s.userId).maybeSingle();
  if (!listData) notFound();
  const list = listData as GiftList;

  const [{ data: itemsData }, { data: statusData }, { data: resData }, { data: purData }] = await Promise.all([
    s.supabase.from("gift_list_items").select(`id, quantity_desired, product:products(${PRODUCT_SELECT})`).eq("gift_list_id", id).order("created_at"),
    s.supabase.rpc("gift_list_item_status", { p_list_id: id }),
    s.supabase.from("reservations").select("id, gift_list_item_id, guest_name, guest_message, status, expires_at, created_at, quantity").order("created_at", { ascending: false }),
    s.supabase.from("purchases").select("id, gift_list_item_id, buyer_name, notes, verification_status, source, created_at").order("created_at", { ascending: false }),
  ]);
  const items = ((itemsData as unknown as ItemRow[]) ?? []).filter((i) => i.product);
  const statusById = new Map(((statusData as ItemStatus[]) ?? []).map((st) => [st.item_id, st]));
  const itemIds = new Set(items.map((i) => i.id));
  const itemName = new Map(items.map((i) => [i.id, i.product.name]));
  type Res = { id: string; gift_list_item_id: string; guest_name: string; guest_message: string | null; status: ReservationStatus; expires_at: string; created_at: string; quantity: number };
  type Pur = { id: string; gift_list_item_id: string | null; buyer_name: string | null; notes: string | null; verification_status: string; source: string; created_at: string };
  const reservations = ((resData as Res[]) ?? []).filter((r) => itemIds.has(r.gift_list_item_id));
  const purchases = ((purData as Pur[]) ?? []).filter((p) => p.gift_list_item_id && itemIds.has(p.gift_list_item_id));

  let results: ProductWithRelations[] = [];
  const search = q?.trim().slice(0, 80);
  if (search) {
    const { data } = await s.supabase.from("products").select(PRODUCT_SELECT).eq("status", "published").ilike("name", `%${search.replace(/[\\%_]/g, (m) => `\\${m}`)}%`).limit(12);
    results = (data as ProductWithRelations[]) ?? [];
  }

  const publicUrl = `${SITE_URL}/lista/${list.slug}`;

  return (
    <div className="container-page py-10">
      <Link href="/minhas-listas" className="text-sm text-ink-soft hover:underline">← Minhas listas</Link>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="h-display text-3xl">{list.title}</h1>
        <Link href={`/lista/${list.slug}`} className="btn-ghost btn-sm" target="_blank">Ver página pública</Link>
      </div>

      <div className="mt-6 rounded-md border border-sage/30 bg-sage-soft p-4 text-sm">
        <p className="font-medium">Link para compartilhar</p>
        <p className="mt-1 break-all font-mono text-xs">{publicUrl}</p>
        <a className="mt-2 inline-block text-sage-dark underline" href={`https://wa.me/?text=${encodeURIComponent(`Veja minha lista de presentes no Mimoa: ${publicUrl}`)}`} target="_blank" rel="noopener">
          Compartilhar pelo WhatsApp
        </a>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        <section>
          <h2 className="h-display text-2xl">Itens da lista</h2>
          <div className="mt-4 space-y-3">
            {items.length === 0 && <EmptyState title="Nenhum item ainda" text="Busque produtos abaixo ou use o botão “Adicionar à lista” na página de cada produto." />}
            {items.map((i) => {
              const st = statusById.get(i.id);
              return (
                <div key={i.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2"><ProductTypeBadge type={i.product.product_type} /></div>
                    <Link href={`/produto/${i.product.slug}`} className="mt-1 block font-medium hover:underline">{i.product.name}</Link>
                    <p className="text-xs text-ink-mute">{formatBRL(i.product.price_cents)} · {i.product.product_type === "local" ? i.product.store?.name : i.product.program?.marketplace_name}</p>
                    {st && (
                      <p className="mt-1 text-xs text-ink-soft">
                        Desejado: {st.quantity_desired} · Reservado: {st.reserved_qty} · Vendido (verificado): {st.purchased_qty}
                        {i.product.product_type === "affiliate" && ` · Compras informadas por convidados: ${st.reported_qty}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={updateItemQtyAction} className="flex items-center gap-1">
                      <input type="hidden" name="item_id" value={i.id} />
                      <input type="hidden" name="list_id" value={list.id} />
                      <label className="sr-only" htmlFor={`q-${i.id}`}>Quantidade</label>
                      <input id={`q-${i.id}`} name="quantity" type="number" min={1} max={50} defaultValue={i.quantity_desired} className="input w-16 py-1" />
                      <button className="btn-ghost btn-sm" type="submit">OK</button>
                    </form>
                    <form action={removeItemAction}>
                      <input type="hidden" name="item_id" value={i.id} />
                      <input type="hidden" name="list_id" value={list.id} />
                      <ConfirmButton message="Remover este item da lista? Itens com reservas não podem ser removidos.">Remover</ConfirmButton>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10">
            <h3 className="font-display text-xl">Adicionar produtos do catálogo</h3>
            <form className="mt-3 flex gap-2" action={`/minhas-listas/${list.id}`}>
              <label htmlFor="busca" className="sr-only">Buscar produtos</label>
              <input id="busca" name="q" defaultValue={search} className="input" placeholder="Buscar produto pelo nome" />
              <button className="btn-primary" type="submit">Buscar</button>
            </form>
            {search && results.length === 0 && <p className="mt-3 text-sm text-ink-soft">Nenhum produto encontrado.</p>}
            <ul className="mt-4 space-y-2">
              {results.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 rounded-md border border-sand-200 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-ink-mute">{formatBRL(p.price_cents)} · {p.product_type === "local" ? "Loja local" : "Oferta afiliada"}</p>
                  </div>
                  <ActionForm action={addToListAction} className="flex shrink-0 items-center gap-2">
                    <input type="hidden" name="list_id" value={list.id} />
                    <input type="hidden" name="product_id" value={p.id} />
                    <SubmitButton className="btn-ghost btn-sm" pendingLabel="…">Adicionar</SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10">
            <h3 className="font-display text-xl">Acompanhamento</h3>
            <p className="mt-1 text-xs text-ink-mute">Reservas de itens locais expiram em 48 horas se a loja não confirmar. Compras de itens afiliados são informadas pelos convidados e não são verificadas automaticamente.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="table-base">
                <thead><tr><th>Item</th><th>Convidado</th><th>Tipo</th><th>Situação</th><th>Data</th></tr></thead>
                <tbody>
                  {reservations.map((r) => (
                    <tr key={r.id}>
                      <td>{itemName.get(r.gift_list_item_id)}</td>
                      <td>{r.guest_name}{r.guest_message && <span className="block text-xs text-ink-mute">“{r.guest_message}”</span>}</td>
                      <td>Reserva</td>
                      <td>{r.status === "pending" && new Date(r.expires_at) < new Date() ? "Expirada" : RESERVATION_STATUS_LABEL[r.status]}</td>
                      <td>{formatDate(r.created_at, true)}</td>
                    </tr>
                  ))}
                  {purchases.map((p) => (
                    <tr key={p.id}>
                      <td>{p.gift_list_item_id ? itemName.get(p.gift_list_item_id) : "—"}</td>
                      <td>{p.buyer_name ?? "—"}{p.notes && <span className="block text-xs text-ink-mute">“{p.notes}”</span>}</td>
                      <td>Compra</td>
                      <td>{PURCHASE_STATUS_LABEL[p.verification_status]}</td>
                      <td>{formatDate(p.created_at, true)}</td>
                    </tr>
                  ))}
                  {reservations.length + purchases.length === 0 && (
                    <tr><td colSpan={5} className="py-6 text-center text-ink-mute">Nenhuma movimentação ainda.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside className="card h-fit p-5">
          <h2 className="font-display text-xl">Dados da lista</h2>
          <ActionForm action={updateListAction} className="mt-4 space-y-4">
            <input type="hidden" name="id" value={list.id} />
            <ListFields list={list} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_public" defaultChecked={list.is_public} /> Lista visível pelo link
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="status" value="closed" defaultChecked={list.status === "closed"} /> Encerrar lista (não aceita novas reservas)
            </label>
            <SubmitButton className="btn-primary w-full" pendingLabel="Salvando…">Salvar</SubmitButton>
          </ActionForm>
        </aside>
      </div>
    </div>
  );
}
