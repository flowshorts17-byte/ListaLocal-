import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { InlineAction } from "@/components/inline-action";
import { formatDate } from "@/lib/format";
import { EVENT_TYPE_LABEL } from "@/lib/labels";
import type { GiftList } from "@/lib/types";
import { setListStatusAction } from "../actions";

export default async function AdminLists() {
  const s = await requireSession(["admin"], "/admin/listas");
  const { data } = await s.supabase.from("gift_lists").select("*, owner:users(email), items:gift_list_items(count)").order("created_at", { ascending: false }).limit(300);
  const lists = (data as unknown as (GiftList & { owner: { email: string } | null; items: { count: number }[] })[]) ?? [];
  return (
    <div>
      <h1 className="h-display text-3xl">Listas de presentes</h1>
      <div className="mt-6 overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Lista</th><th>Organizador</th><th>Evento</th><th>Itens</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {lists.map((l) => (
              <tr key={l.id}>
                <td><Link href={`/lista/${l.slug}`} className="underline">{l.title}</Link><span className="block text-xs text-ink-mute">criada {formatDate(l.created_at)}</span></td>
                <td className="text-xs">{l.owner?.email ?? "—"}</td>
                <td className="text-xs">{EVENT_TYPE_LABEL[l.event_type]} · {formatDate(l.event_date)}</td>
                <td>{l.items?.[0]?.count ?? 0}</td>
                <td>{l.status === "active" ? "Ativa" : l.status === "closed" ? "Encerrada" : "Arquivada"}</td>
                <td>
                  <div className="flex gap-1">
                    {l.status !== "archived" && <InlineAction action={setListStatusAction} fields={{ id: l.id, status: "archived" }} label="Arquivar" />}
                    {l.status !== "active" && <InlineAction action={setListStatusAction} fields={{ id: l.id, status: "active" }} label="Reativar" />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
