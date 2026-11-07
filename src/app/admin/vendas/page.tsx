import { requireSession } from "@/lib/auth";
import { ActionForm, SubmitButton } from "@/components/forms";
import { InlineAction } from "@/components/inline-action";
import { formatBRL, formatDate } from "@/lib/format";
import { COMMISSION_STATUS_LABEL, PURCHASE_SOURCE_LABEL, PURCHASE_STATUS_LABEL } from "@/lib/labels";
import { registerCommissionAction, registerSaleAction, setCommissionStatusAction, setPurchaseStatusAction } from "../actions";

type Purchase = { id: string; created_at: string; product_type: string; source: string; verification_status: string; quantity: number; amount_cents: number | null; buyer_name: string | null; notes: string | null; product: { name: string } | null };
type Commission = { id: string; created_at: string; amount_cents: number; status: string; reference_month: string | null; external_reference: string | null; program: { marketplace_name: string } | null };

export default async function AdminSales() {
  const s = await requireSession(["admin"], "/admin/vendas");
  const [{ data: pur }, { data: com }, { data: products }, { data: programs }] = await Promise.all([
    s.supabase.from("purchases").select("id, created_at, product_type, source, verification_status, quantity, amount_cents, buyer_name, notes, product:products(name)").order("created_at", { ascending: false }).limit(200),
    s.supabase.from("commissions").select("id, created_at, amount_cents, status, reference_month, external_reference, program:affiliate_programs(marketplace_name)").order("created_at", { ascending: false }).limit(200),
    s.supabase.from("products").select("id, name, product_type").neq("status", "archived").order("name").limit(1000),
    s.supabase.from("affiliate_programs").select("id, marketplace_name").order("marketplace_name"),
  ]);
  const purchases = (pur as unknown as Purchase[]) ?? [];
  const commissions = (com as unknown as Commission[]) ?? [];
  return (
    <div className="space-y-12">
      <section className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <h1 className="h-display text-3xl">Vendas</h1>
          <p className="mt-2 text-sm text-ink-soft">“Informada” = declarada por convidado, sem verificação. “Verificada” = confirmada pela loja, pelo admin ou por relatório do programa.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Data</th><th>Produto</th><th>Fonte</th><th>Situação</th><th>Valor</th><th></th></tr></thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap text-xs">{formatDate(p.created_at, true)}</td>
                    <td>{p.product?.name ?? "—"}<span className="block text-xs text-ink-mute">{p.quantity}× · {p.buyer_name ?? ""}</span></td>
                    <td className="text-xs">{PURCHASE_SOURCE_LABEL[p.source]}</td>
                    <td className="text-xs">{PURCHASE_STATUS_LABEL[p.verification_status]}</td>
                    <td>{formatBRL(p.amount_cents)}</td>
                    <td>
                      {p.verification_status === "reported" && (
                        <div className="flex gap-1">
                          <InlineAction action={setPurchaseStatusAction} fields={{ id: p.id, status: "verified" }} label="Verificar" tone="btn-sage" />
                          <InlineAction action={setPurchaseStatusAction} fields={{ id: p.id, status: "rejected" }} label="Rejeitar" />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {purchases.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-ink-mute">Nenhuma venda registrada.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="card h-fit p-5">
          <h2 className="font-display text-xl">Registrar venda confirmada</h2>
          <p className="mt-1 text-xs text-ink-mute">Use somente com confirmação (loja, comprovante ou relatório do programa).</p>
          <ActionForm action={registerSaleAction} className="mt-4 space-y-3" resetOnSuccess>
            <select className="input" name="product_id" required defaultValue="">
              <option value="" disabled>Produto…</option>
              {((products as { id: string; name: string; product_type: string }[]) ?? []).map((p) => <option key={p.id} value={p.id}>{p.name} ({p.product_type === "local" ? "local" : "afiliado"})</option>)}
            </select>
            <input className="input" name="quantity" type="number" min={1} max={100} defaultValue={1} aria-label="Quantidade" />
            <input className="input" name="amount" placeholder="Valor total (vazio = preço × qtd)" inputMode="decimal" />
            <select className="input" name="source" defaultValue="admin_confirmed">
              <option value="admin_confirmed">Confirmada pelo admin</option>
              <option value="affiliate_report">Relatório do programa (afiliado)</option>
            </select>
            <input className="input" name="buyer_name" placeholder="Comprador (opcional)" />
            <textarea className="input" name="notes" placeholder="Observações / comprovante" />
            <SubmitButton className="btn-primary w-full">Registrar</SubmitButton>
          </ActionForm>
        </aside>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <h2 className="h-display text-3xl">Comissões</h2>
          <p className="mt-2 text-sm text-ink-soft">Lançamentos manuais a partir dos relatórios dos programas de afiliados. Estimada ≠ aprovada.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Mês</th><th>Programa</th><th>Valor</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id}>
                    <td className="text-xs">{c.reference_month ? c.reference_month.slice(0, 7) : formatDate(c.created_at)}</td>
                    <td>{c.program?.marketplace_name ?? "—"}<span className="block text-xs text-ink-mute">{c.external_reference}</span></td>
                    <td>{formatBRL(c.amount_cents)}</td>
                    <td>{COMMISSION_STATUS_LABEL[c.status]}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {c.status === "estimated" && <InlineAction action={setCommissionStatusAction} fields={{ id: c.id, status: "approved" }} label="Aprovada" tone="btn-sage" />}
                        {c.status === "approved" && <InlineAction action={setCommissionStatusAction} fields={{ id: c.id, status: "paid" }} label="Paga" />}
                        {c.status !== "rejected" && c.status !== "paid" && <InlineAction action={setCommissionStatusAction} fields={{ id: c.id, status: "rejected" }} label="Rejeitada" />}
                      </div>
                    </td>
                  </tr>
                ))}
                {commissions.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-ink-mute">Nenhuma comissão lançada.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="card h-fit p-5">
          <h2 className="font-display text-xl">Lançar comissão</h2>
          <ActionForm action={registerCommissionAction} className="mt-4 space-y-3" resetOnSuccess>
            <select className="input" name="affiliate_program_id" defaultValue="">
              <option value="">Programa…</option>
              {((programs as { id: string; marketplace_name: string }[]) ?? []).map((p) => <option key={p.id} value={p.id}>{p.marketplace_name}</option>)}
            </select>
            <input className="input" name="amount" placeholder="Valor (R$)" inputMode="decimal" required />
            <input className="input" name="reference_month" type="month" aria-label="Mês de referência" />
            <select className="input" name="status" defaultValue="estimated">
              <option value="estimated">Estimada</option>
              <option value="approved">Aprovada</option>
            </select>
            <input className="input" name="external_reference" placeholder="Referência do relatório" />
            <textarea className="input" name="notes" placeholder="Observações" />
            <SubmitButton className="btn-primary w-full">Lançar</SubmitButton>
          </ActionForm>
        </aside>
      </section>
    </div>
  );
}
