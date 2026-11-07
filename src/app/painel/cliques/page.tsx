import { requireSession } from "@/lib/auth";
import { EmptyState } from "@/components/notices";
import { daysAgoISO, formatNumber } from "@/lib/format";
import { getMyStore } from "../store";

export default async function MyClicksPage() {
  const s = await requireSession(["lojista"], "/painel/cliques");
  const store = await getMyStore(s);
  if (!store) return <EmptyState title="Cadastre sua loja primeiro" action={{ href: "/painel/loja", label: "Cadastrar loja" }} />;
  const since = daysAgoISO(30);
  const [{ data: events }, { data: products }] = await Promise.all([
    s.supabase.from("events").select("product_id, event_type").eq("store_id", store.id).gte("created_at", since).in("event_type", ["product_view", "whatsapp_click"]).limit(10000),
    s.supabase.from("products").select("id, name").eq("store_id", store.id),
  ]);
  const names = new Map(((products as { id: string; name: string }[]) ?? []).map((p) => [p.id, p.name]));
  const agg = new Map<string, { views: number; clicks: number }>();
  for (const e of (events as { product_id: string | null; event_type: string }[]) ?? []) {
    if (!e.product_id) continue;
    const a = agg.get(e.product_id) ?? { views: 0, clicks: 0 };
    if (e.event_type === "product_view") a.views++;
    else a.clicks++;
    agg.set(e.product_id, a);
  }
  const rows = [...agg.entries()].sort((a, b) => b[1].clicks - a[1].clicks);
  return (
    <div>
      <h1 className="h-display text-3xl">Cliques (últimos 30 dias)</h1>
      <p className="mt-2 text-sm text-ink-soft">Um clique no WhatsApp indica interesse, não uma venda.</p>
      <div className="mt-6 overflow-x-auto">
        {rows.length === 0 ? (
          <EmptyState title="Ainda não há visualizações ou cliques" />
        ) : (
          <table className="table-base">
            <thead><tr><th>Produto</th><th>Visualizações</th><th>Cliques no WhatsApp</th></tr></thead>
            <tbody>
              {rows.map(([id, a]) => (
                <tr key={id}><td>{names.get(id) ?? "—"}</td><td>{formatNumber(a.views)}</td><td>{formatNumber(a.clicks)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
