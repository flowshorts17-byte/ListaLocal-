import { requireSession } from "@/lib/auth";
import { ActionForm, SubmitButton } from "@/components/forms";
import { InlineAction } from "@/components/inline-action";
import type { Banner } from "@/lib/types";
import { saveBannerAction, toggleBannerAction } from "../actions";

export default async function AdminBanners() {
  const s = await requireSession(["admin"], "/admin/banners");
  const { data } = await s.supabase.from("banners").select("*").order("sort_order");
  const banners = (data as Banner[]) ?? [];
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
      <section>
        <h1 className="h-display text-3xl">Banners</h1>
        <p className="mt-2 text-sm text-ink-soft">O primeiro banner ativo (menor ordem) aparece na Home.</p>
        <div className="mt-6 space-y-2">
          {banners.map((b) => (
            <div key={b.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{b.title}</p>
                <p className="text-xs text-ink-mute">ordem {b.sort_order} · {b.link_url ?? "sem link"} · {b.is_active ? "ativo" : "inativo"}</p>
              </div>
              <div className="flex gap-1">
                <InlineAction action={toggleBannerAction} fields={{ id: b.id, value: String(!b.is_active) }} label={b.is_active ? "Desativar" : "Ativar"} />
                <InlineAction action={toggleBannerAction} fields={{ id: b.id, delete: "1" }} label="Excluir" />
              </div>
            </div>
          ))}
        </div>
      </section>
      <aside className="card h-fit p-5">
        <h2 className="font-display text-xl">Novo banner</h2>
        <ActionForm action={saveBannerAction} className="mt-4 space-y-3" resetOnSuccess>
          <input className="input" name="title" placeholder="Título" required />
          <input className="input" name="subtitle" placeholder="Subtítulo" />
          <input className="input" name="image_url" placeholder="Imagem https:// (opcional)" />
          <input className="input" name="link_url" placeholder="Link (/catalogo ou https://)" />
          <input className="input" name="cta_label" placeholder="Texto do botão" />
          <input className="input" name="sort_order" type="number" defaultValue={0} aria-label="Ordem" />
          <SubmitButton className="btn-primary w-full">Criar</SubmitButton>
        </ActionForm>
      </aside>
    </div>
  );
}
