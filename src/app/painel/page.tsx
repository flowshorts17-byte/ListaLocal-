import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { Badge } from "@/components/badges";
import { STORE_STATUS_LABEL } from "@/lib/labels";
import { formatNumber } from "@/lib/format";
import { getMyStore } from "./store";

export default async function PainelHome() {
  const s = await requireSession(["lojista"], "/painel");
  const store = await getMyStore(s);
  if (!store) {
    return (
      <div className="card max-w-xl p-6">
        <h1 className="h-display text-2xl">Bem-vindo(a)!</h1>
        <p className="mt-2 text-sm text-ink-soft">Cadastre os dados da sua loja para começar. Após a aprovação, seus produtos aparecem no catálogo.</p>
        <Link href="/painel/loja" className="btn-sage mt-5">Cadastrar minha loja</Link>
      </div>
    );
  }
  const { data } = await s.supabase.rpc("store_metrics", { p_store_id: store.id, p_days: 30 });
  const m = (data as Record<string, number>) ?? {};
  const cards = [
    { label: "Visualizações de produtos", value: m.product_views, hint: "últimos 30 dias" },
    { label: "Cliques no WhatsApp", value: m.whatsapp_clicks, hint: "intenção de contato — não é venda" },
    { label: "Reservas pendentes", value: m.reservations_pending, hint: "aguardando sua confirmação" },
    { label: "Vendas concluídas", value: m.verified_sales, hint: "confirmadas por você (30 dias)" },
  ];
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="h-display text-3xl">{store.name}</h1>
        <Badge tone={store.status === "approved" ? "sage" : "warn"}>{STORE_STATUS_LABEL[store.status]}</Badge>
      </div>
      {store.status !== "approved" && (
        <p className="mt-3 max-w-2xl rounded-md bg-warn-soft p-3 text-sm">
          Sua loja ainda não está visível ao público. Você já pode cadastrar produtos como rascunho; a publicação é liberada após a aprovação.
        </p>
      )}
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-xs text-ink-soft">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold">{formatNumber(c.value)}</p>
            <p className="mt-1 text-[11px] text-ink-mute">{c.hint}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-2">
        <Link href="/painel/produtos/novo" className="btn-primary">Cadastrar produto</Link>
        <Link href="/painel/reservas" className="btn-ghost">Ver reservas</Link>
        {store.status === "approved" && <Link href={`/lojas/${store.slug}`} className="btn-ghost">Ver página pública</Link>}
      </div>
    </div>
  );
}
