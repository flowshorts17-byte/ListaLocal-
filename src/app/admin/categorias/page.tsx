import { requireSession } from "@/lib/auth";
import { ActionForm, SubmitButton } from "@/components/forms";
import { InlineAction } from "@/components/inline-action";
import type { Category } from "@/lib/types";
import { saveCategoryAction, toggleCategoryAction } from "../actions";

export default async function AdminCategories() {
  const s = await requireSession(["admin"], "/admin/categorias");
  const { data } = await s.supabase.from("categories").select("*").order("sort_order").order("name");
  const cats = (data as Category[]) ?? [];
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <section>
        <h1 className="h-display text-3xl">Categorias</h1>
        <div className="mt-6 space-y-2">
          {cats.map((c) => (
            <div key={c.id} className="card flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
              <ActionForm action={saveCategoryAction} className="flex flex-1 flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={c.id} />
                <input className="input max-w-56" name="name" defaultValue={c.name} aria-label="Nome" />
                <input className="input w-20" name="sort_order" type="number" defaultValue={c.sort_order} aria-label="Ordem" />
                <input type="hidden" name="description" value={c.description ?? ""} />
                <SubmitButton className="btn-ghost btn-sm">Salvar</SubmitButton>
              </ActionForm>
              <span className="text-xs text-ink-mute">/{c.slug}</span>
              <InlineAction action={toggleCategoryAction} fields={{ id: c.id, value: String(!c.is_active) }} label={c.is_active ? "Desativar" : "Ativar"} />
            </div>
          ))}
        </div>
      </section>
      <aside className="card h-fit p-5">
        <h2 className="font-display text-xl">Nova categoria</h2>
        <ActionForm action={saveCategoryAction} className="mt-4 space-y-3" resetOnSuccess>
          <input className="input" name="name" placeholder="Nome" required />
          <textarea className="input" name="description" placeholder="Descrição (opcional)" />
          <input className="input" name="sort_order" type="number" defaultValue={0} aria-label="Ordem" />
          <SubmitButton className="btn-primary w-full">Criar</SubmitButton>
        </ActionForm>
      </aside>
    </div>
  );
}
