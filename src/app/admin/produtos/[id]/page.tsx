import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { ProductForm } from "@/components/product-form";
import type { Product } from "@/lib/types";
import { saveAdminProductAction } from "../../actions";
import { adminFormData } from "../admin-form-data";

export default async function AdminEditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ criado?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const s = await requireSession(["admin"], `/admin/produtos/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await s.supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const product = data as Product;
  const d = await adminFormData(s);
  return (
    <div className="max-w-2xl">
      <Link href="/admin/produtos" className="text-sm text-ink-soft hover:underline">← Produtos</Link>
      <h1 className="h-display mt-2 text-3xl">Editar produto</h1>
      {sp.criado && <p className="mt-3 rounded-md bg-sage-soft p-3 text-sm text-sage-dark">Produto cadastrado.</p>}
      {product.status === "published" && <p className="mt-2 text-sm"><Link className="underline" href={`/produto/${product.slug}`}>Ver no site</Link></p>}
      <div className="mt-6">
        <ProductForm action={saveAdminProductAction} product={product} type={product.product_type} categories={d.categories} stores={d.stores} programs={d.programs} isAdmin />
      </div>
    </div>
  );
}
