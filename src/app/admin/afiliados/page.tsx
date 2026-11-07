import { requireSession } from "@/lib/auth";
import { ActionForm, SubmitButton } from "@/components/forms";
import { InlineAction } from "@/components/inline-action";
import type { AffiliateProgram } from "@/lib/types";
import { saveProgramAction, toggleProgramAction } from "../actions";

export default async function AdminPrograms() {
  const s = await requireSession(["admin"], "/admin/afiliados");
  const { data } = await s.supabase.from("affiliate_programs").select("*").order("marketplace_name");
  const programs = (data as AffiliateProgram[]) ?? [];
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
      <section>
        <h1 className="h-display text-3xl">Programas de afiliados</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Ative um programa somente depois de aprovado nele. Os links de cada produto devem ser gerados no painel oficial do programa e respeitar seus termos.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Programa</th><th>Comissão estimada</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {programs.map((p) => (
                <tr key={p.id}>
                  <td>{p.marketplace_name}<span className="block text-xs text-ink-mute">{p.name}</span>{p.notes && <span className="block text-xs text-ink-mute">{p.notes}</span>}</td>
                  <td>{p.estimated_commission_pct != null ? `${p.estimated_commission_pct}%` : "—"}</td>
                  <td>{p.is_active ? "Ativo" : "Inativo"}</td>
                  <td><InlineAction action={toggleProgramAction} fields={{ id: p.id, value: String(!p.is_active) }} label={p.is_active ? "Desativar" : "Ativar"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <aside className="card h-fit p-5">
        <h2 className="font-display text-xl">Novo programa</h2>
        <ActionForm action={saveProgramAction} className="mt-4 space-y-3" resetOnSuccess>
          <input className="input" name="name" placeholder="Nome do programa" required />
          <input className="input" name="marketplace_name" placeholder="Marketplace (ex.: Amazon)" required />
          <input className="input" name="website_url" placeholder="Site https://" />
          <input className="input" name="terms_url" placeholder="Termos do programa https://" />
          <input className="input" name="estimated_commission_pct" placeholder="Comissão estimada (%)" inputMode="decimal" />
          <textarea className="input" name="notes" placeholder="Observações" />
          <SubmitButton className="btn-primary w-full">Cadastrar</SubmitButton>
        </ActionForm>
      </aside>
    </div>
  );
}
