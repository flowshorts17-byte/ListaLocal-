import { requireSession } from "@/lib/auth";
import { formatDate, formatNumber } from "@/lib/format";

type Click = { id: number; created_at: string; utm_source: string | null; referrer: string | null; product: { name: string } | null; program: { marketplace_name: string } | null };
type Ev = { id: number; created_at: string; event_type: string; product: { name: string } | null; store: { name: string } | null };

export default async function AdminClicks() {
  const s = await requireSession(["admin"], "/admin/cliques");
  const [{ data: aff }, { data: wa }] = await Promise.all([
    s.supabase.from("affiliate_clicks").select("id, created_at, utm_source, referrer, product:products(name), program:affiliate_programs(marketplace_name)").order("created_at", { ascending: false }).limit(100),
    s.supabase.from("events").select("id, created_at, event_type, product:products(name), store:stores(name)").eq("event_type", "whatsapp_click").order("created_at", { ascending: false }).limit(100),
  ]);
  const affRows = (aff as unknown as Click[]) ?? [];
  const waRows = (wa as unknown as Ev[]) ?? [];
  const top = new Map<string, number>();
  [...affRows.map((r) => r.product?.name), ...waRows.map((r) => r.product?.name)].forEach((n) => n && top.set(n, (top.get(n) ?? 0) + 1));
  return (
    <div className="space-y-10">
      <div>
        <h1 className="h-display text-3xl">Cliques</h1>
        <p className="mt-2 text-sm text-ink-soft">Cliques registram intenção. Nenhum clique é contado como venda.</p>
      </div>
      <section>
        <h2 className="font-display text-xl">Mais clicados (últimos 200 cliques)</h2>
        <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
          {[...top.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n, c]) => <li key={n} className="flex justify-between border-b border-sand-200 py-1"><span>{n}</span><span>{formatNumber(c)}</span></li>)}
        </ul>
      </section>
      <section>
        <h2 className="font-display text-xl">Links de afiliados</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Data</th><th>Produto</th><th>Marketplace</th><th>Origem</th></tr></thead>
            <tbody>
              {affRows.map((r) => <tr key={r.id}><td className="whitespace-nowrap text-xs">{formatDate(r.created_at, true)}</td><td>{r.product?.name}</td><td>{r.program?.marketplace_name}</td><td className="text-xs">{r.utm_source ?? r.referrer ?? "—"}</td></tr>)}
              {affRows.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-ink-mute">Sem cliques.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2 className="font-display text-xl">WhatsApp (lojas locais)</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Data</th><th>Produto</th><th>Loja</th></tr></thead>
            <tbody>
              {waRows.map((r) => <tr key={r.id}><td className="whitespace-nowrap text-xs">{formatDate(r.created_at, true)}</td><td>{r.product?.name}</td><td>{r.store?.name}</td></tr>)}
              {waRows.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-ink-mute">Sem cliques.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
