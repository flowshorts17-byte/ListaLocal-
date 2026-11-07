import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { ProductForm } from "@/components/product-form";
import { getCategories } from "@/lib/data";
import type { Product } from "@/lib/types";
import { saveMyProductAction } from "../../actions";
import { getMyStore } from "../../store";

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ criado?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const s = await requireSession(["lojista"], `/painel/produtos/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const store = await getMyStore(s);
  if (!store) notFound();
  const { data } = await s.supabase.from("products").select("*").eq("id", id).eq("store_id", store.id).maybeSingle();
  if (!data) notFound();
  const product = data as Product;
  const categories = await getCategories();
  return (
    <div className="max-w-2xl">
      <Link href="/painel/produtos" className="text-sm text-ink-soft hover:underline">← Produtos</Link>
      <h1 className="h-display mt-2 text-3xl">Editar produto</h1>
      {sp.criado && <p className="mt-3 rounded-md bg-sage-soft p-3 text-sm text-sage-dark">Produto cadastrado.</p>}
      <div className="mt-6">
        <ProductForm action={saveMyProductAction} product={product} type="local" categories={categories} canPublish={store.status === "approved"} />
      </div>
    </div>
  );
}
