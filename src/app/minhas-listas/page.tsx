import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { ActionForm, SubmitButton } from "@/components/forms";
import { EmptyState } from "@/components/notices";
import { EVENT_TYPE_LABEL } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import type { GiftList } from "@/lib/types";
import { createListAction } from "./actions";
import { ListFields } from "./list-form";

export const metadata: Metadata = { title: "Minhas listas de presentes", robots: { index: false } };

export default async function MyListsPage() {
  const s = await requireSession(undefined, "/minhas-listas");
  const { data } = await s.supabase.from("gift_lists").select("*").eq("owner_id", s.userId).order("created_at", { ascending: false });
  const lists = (data as GiftList[]) ?? [];
  return (
    <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_380px]">
      <section>
        <h1 className="h-display text-3xl">Minhas listas</h1>
        <p className="mt-2 text-sm text-ink-soft">Crie, compartilhe e acompanhe os presentes do seu evento.</p>
        <div className="mt-6 space-y-3">
          {lists.length === 0 && <EmptyState title="Você ainda não criou listas" text="Use o formulário ao lado para começar." />}
          {lists.map((l) => (
            <Link key={l.id} href={`/minhas-listas/${l.id}`} className="card flex items-center justify-between gap-4 p-4 hover:border-sand-300">
              <div>
                <p className="font-medium">{l.title}</p>
                <p className="text-xs text-ink-mute">{EVENT_TYPE_LABEL[l.event_type]} · {l.event_date ? formatDate(l.event_date) : "sem data"}{l.status !== "active" ? " · encerrada" : ""}</p>
              </div>
              <span className="text-sm text-ink-soft">Gerenciar →</span>
            </Link>
          ))}
        </div>
      </section>
      <aside className="card h-fit p-5">
        <h2 className="font-display text-xl">Nova lista</h2>
        <ActionForm action={createListAction} className="mt-4 space-y-4">
          <ListFields />
          <SubmitButton className="btn-sage w-full" pendingLabel="Criando…">Criar lista</SubmitButton>
        </ActionForm>
      </aside>
    </div>
  );
}
