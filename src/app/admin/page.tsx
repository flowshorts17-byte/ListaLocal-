import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { StatCard } from "@/components/inline-action";
import { formatBRL, formatNumber } from "@/lib/format";

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const sp = await searchParams;
  const days = [7, 30, 90, 365].includes(Number(sp.dias)) ? Number(sp.dias) : 30;
  const s = await requireSession(["admin"], "/admin");
  const { data, error } = await s.supabase.rpc("admin_metrics", { p_days: days });
  const m = (data as Record<string, number>) ?? {};
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="h-display text-3xl">Indicadores</h1>
        <div className="flex gap-1 text-sm">
          {[7, 30, 90, 365].map((d) => (
            <Link key={d} href={`/admin?dias=${d}`} className={`rounded-md px-3 py-1 ${d === days ? "bg-ink text-white" : "border border-sand-300"}`}>
              {d} dias
            </Link>
          ))}
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-danger">Não foi possível carregar os indicadores.</p>}

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wider text-ink-soft">Tráfego</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Visitantes únicos" value={formatNumber(m.visitors)} hint="somente quem aceitou cookies de métricas" />
        <StatCard label="Visualizações de produtos" value={formatNumber(m.product_views)} />
        <StatCard label="Produtos publicados" value={formatNumber(m.products_published)} />
        <StatCard label="Listas criadas (total)" value={formatNumber(m.gift_lists)} />
      </div>

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wider text-ink-soft">Funil comercial — cliques não são vendas</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Cliques no WhatsApp (lojas locais)" value={formatNumber(m.whatsapp_clicks)} hint="interesse em contato" />
        <StatCard label="Cliques em links de afiliados" value={formatNumber(m.affiliate_clicks)} hint="saídas para marketplaces" />
        <StatCard label="Intenções de compra (reservas)" value={formatNumber(m.purchase_intents)} hint="reservas criadas em listas" />
        <StatCard label="Vendas informadas" value={formatNumber(m.reported_sales)} hint="declaradas por convidados — não verificadas" />
        <StatCard label="Vendas verificadas" value={formatNumber(m.verified_sales)} hint={`confirmadas por loja/admin · ${formatBRL(m.verified_sales_cents)}`} />
        <StatCard label="Lojas aguardando aprovação" value={formatNumber(m.stores_pending)} />
      </div>

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wider text-ink-soft">Comissões de afiliados</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Comissões estimadas" value={formatBRL(m.commissions_estimated_cents)} hint="lançadas manualmente, ainda não aprovadas" />
        <StatCard label="Comissões aprovadas" value={formatBRL(m.commissions_approved_cents)} hint="aprovadas/pagas pelos programas" />
      </div>
    </div>
  );
}
