import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { ProductForm } from "@/components/product-form";
import { saveAdminProductAction } from "../../actions";
import { adminFormData } from "../admin-form-data";

export default async function AdminNewProduct({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const sp = await searchParams;
  const type = sp.tipo === "affiliate" ? "affiliate" : "local";
  const s = await requireSession(["admin"], "/admin/produtos/novo");
  const d = await adminFormData(s);
  return (
    <div className="max-w-2xl">
      <Link href="/admin/produtos" className="text-sm text-ink-soft hover:underline">← Produtos</Link>
      <h1 className="h-display mt-2 text-3xl">{type === "affiliate" ? "Novo produto afiliado" : "Novo produto local"}</h1>
      {type === "affiliate" && d.programs.length === 0 && (
        <p className="mt-4 rounded-md bg-warn-soft p-3 text-sm">Cadastre um programa de afiliados antes. <Link className="underline" href="/admin/afiliados">Programas</Link></p>
      )}
      <div className="mt-6">
        <ProductForm action={saveAdminProductAction} type={type} categories={d.categories} stores={d.stores} programs={d.programs} isAdmin />
      </div>
    </div>
  );
}
