import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { InlineAction } from "@/components/inline-action";
import { ProductTypeBadge, Badge } from "@/components/badges";
import { PRODUCT_SELECT } from "@/lib/data";
import { formatBRL } from "@/lib/format";
import { PRODUCT_STATUS_LABEL } from "@/lib/labels";
import type { ProductWithRelations } from "@/lib/types";
import { adminQuickProductAction } from "../actions";

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ tipo?: string; status?: string; q?: string }> }) {
  const sp = await searchParams;
  const s = await requireSession(["admin"], "/admin/produtos");
  let q = s.supabase.from("products").select(PRODUCT_SELECT).order("updated_at", { ascending: false }).limit(300);
  if (sp.tipo === "local" || sp.tipo === "affiliate") q = q.eq("product_type", sp.tipo);
  if (sp.status && ["draft", "published", "archived"].includes(sp.status)) q = q.eq("status", sp.status);
  if (sp.q) q = q.ilike("name", `%${sp.q.slice(0, 80).replace(/[\\%_]/g, (m) => `\\${m}`)}%`);
  const { data } = await q;
  const products = (data as ProductWithRelations[]) ?? [];
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h-display text-3xl">Produtos</h1>
        <div className="flex gap-2">
          <Link href="/admin/produtos/novo?tipo=local" className="btn-ghost">+ Produto local</Link>
          <Link href="/admin/produtos/novo?tipo=affiliate" className="btn-primary">+ Produto afiliado</Link>
        </div>
      </div>
      <form className="mt-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} className="input max-w-xs" placeholder="Buscar" />
        <select name="tipo" defaultValue={sp.tipo ?? ""} className="input w-auto"><option value="">Todos os tipos</option><option value="local">Local</option><option value="affiliate">Afiliado</option></select>
        <select name="status" defaultValue={sp.status ?? ""} className="input w-auto"><option value="">Todos os status</option>{Object.entries(PRODUCT_STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <button className="btn-primary">Filtrar</button>
      </form>
      <div className="mt-6 overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Produto</th><th>Origem</th><th>Preço</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/produtos/${p.id}`} className="font-medium underline">{p.name}</Link>
                  <div className="mt-1 flex gap-1"><ProductTypeBadge type={p.product_type} />{p.is_featured && <Badge tone="ink">Destaque</Badge>}{p.is_demo && <Badge tone="warn">demo</Badge>}</div>
                </td>
                <td className="text-xs">{p.product_type === "local" ? p.store?.name : p.program?.marketplace_name ?? "—"}</td>
                <td>{formatBRL(p.price_cents)}</td>
                <td>{PRODUCT_STATUS_LABEL[p.status]}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {p.status !== "published" ? (
                      <InlineAction action={adminQuickProductAction} fields={{ id: p.id, field: "status", value: "published" }} label="Ativar" tone="btn-sage" />
                    ) : (
                      <InlineAction action={adminQuickProductAction} fields={{ id: p.id, field: "status", value: "archived" }} label="Desativar" />
                    )}
                    <InlineAction action={adminQuickProductAction} fields={{ id: p.id, field: "is_featured", value: String(!p.is_featured) }} label={p.is_featured ? "Tirar destaque" : "Destacar"} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
