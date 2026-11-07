import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { EmptyState } from "@/components/notices";
import { formatBRL, formatDate } from "@/lib/format";
import { AVAILABILITY_LABEL, PRODUCT_STATUS_LABEL } from "@/lib/labels";
import type { Product } from "@/lib/types";
import { quickProductAction } from "../actions";
import { getMyStore } from "../store";

export default async function MyProductsPage() {
  const s = await requireSession(["lojista"], "/painel/produtos");
  const store = await getMyStore(s);
  if (!store) return <EmptyState title="Cadastre sua loja primeiro" action={{ href: "/painel/loja", label: "Cadastrar loja" }} />;
  const { data } = await s.supabase.from("products").select("*").eq("store_id", store.id).order("updated_at", { ascending: false });
  const products = (data as Product[]) ?? [];
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="h-display text-3xl">Produtos</h1>
        <Link href="/painel/produtos/novo" className="btn-primary">Novo produto</Link>
      </div>
      {products.length === 0 ? (
        <div className="mt-6"><EmptyState title="Nenhum produto cadastrado" /></div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Produto</th><th>Preço</th><th>Disponibilidade</th><th>Publicação</th><th>Atualizado</th><th></th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.name}</td>
                  <td>{formatBRL(p.price_cents)}</td>
                  <td>
                    <form action={quickProductAction} className="flex gap-1">
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="field" value="availability" />
                      <select name="value" defaultValue={p.availability} className="input py-1 text-xs" aria-label="Disponibilidade">
                        {Object.entries(AVAILABILITY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <button className="btn-ghost btn-sm" type="submit">OK</button>
                    </form>
                  </td>
                  <td>
                    <form action={quickProductAction} className="flex gap-1">
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="field" value="status" />
                      <select name="value" defaultValue={p.status} className="input py-1 text-xs" aria-label="Publicação">
                        {Object.entries(PRODUCT_STATUS_LABEL).map(([v, l]) => <option key={v} value={v} disabled={v === "published" && store.status !== "approved"}>{l}</option>)}
                      </select>
                      <button className="btn-ghost btn-sm" type="submit">OK</button>
                    </form>
                  </td>
                  <td className="whitespace-nowrap text-xs text-ink-soft">{formatDate(p.updated_at, true)}</td>
                  <td><Link href={`/painel/produtos/${p.id}`} className="text-sm underline">Editar</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
