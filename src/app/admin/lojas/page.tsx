import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { InlineAction } from "@/components/inline-action";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge } from "@/components/badges";
import { formatDate } from "@/lib/format";
import { BR_STATES, STORE_STATUS_LABEL } from "@/lib/labels";
import { formatWhatsappDisplay } from "@/lib/whatsapp";
import type { Store } from "@/lib/types";
import { createStoreAction, setStoreStatusAction } from "../actions";

export default async function AdminStores() {
  const s = await requireSession(["admin"], "/admin/lojas");
  const { data } = await s.supabase.from("stores").select("*").order("status").order("created_at", { ascending: false }).limit(500);
  const stores = (data as Store[]) ?? [];
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
      <section>
        <h1 className="h-display text-3xl">Lojas</h1>
        <div className="mt-6 overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Loja</th><th>Cidade</th><th>WhatsApp</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {stores.map((st) => (
                <tr key={st.id}>
                  <td>
                    {st.status === "approved" ? <Link href={`/lojas/${st.slug}`} className="underline">{st.name}</Link> : st.name}
                    {st.is_demo && <> <Badge tone="warn">demo</Badge></>}
                    <span className="block text-xs text-ink-mute">desde {formatDate(st.created_at)}</span>
                  </td>
                  <td>{st.city}/{st.state}</td>
                  <td className="whitespace-nowrap">{formatWhatsappDisplay(st.whatsapp)}</td>
                  <td>{STORE_STATUS_LABEL[st.status]}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {st.status !== "approved" && <InlineAction action={setStoreStatusAction} fields={{ id: st.id, status: "approved" }} label="Aprovar" tone="btn-sage" />}
                      {st.status === "pending" && <InlineAction action={setStoreStatusAction} fields={{ id: st.id, status: "rejected" }} label="Recusar" />}
                      {st.status === "approved" && <InlineAction action={setStoreStatusAction} fields={{ id: st.id, status: "suspended" }} label="Suspender" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <aside className="card h-fit p-5">
        <h2 className="font-display text-xl">Cadastrar loja</h2>
        <p className="mt-1 text-xs text-ink-mute">Para estabelecimentos atendidos pela equipe. Opcionalmente vincule a um usuário já cadastrado.</p>
        <ActionForm action={createStoreAction} className="mt-4 space-y-3" resetOnSuccess>
          <input className="input" name="name" placeholder="Nome da loja" required />
          <textarea className="input" name="description" placeholder="Descrição" />
          <div className="grid grid-cols-[1fr_90px] gap-2">
            <input className="input" name="city" placeholder="Cidade" defaultValue="Santo Augusto" required />
            <select className="input" name="state" defaultValue="RS">{BR_STATES.map((u) => <option key={u}>{u}</option>)}</select>
          </div>
          <input className="input" name="address" placeholder="Endereço (opcional)" />
          <input className="input" name="whatsapp" placeholder="WhatsApp (55) 99999-9999" required />
          <input className="input" name="instagram" placeholder="Instagram (opcional)" />
          <input className="input" name="owner_email" type="email" placeholder="E-mail do lojista (opcional)" />
          <SubmitButton className="btn-primary w-full">Cadastrar</SubmitButton>
        </ActionForm>
      </aside>
    </div>
  );
}
