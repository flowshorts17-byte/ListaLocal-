import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";
import { CatalogView, type CatalogSearchParams } from "../../catalogo/catalog-view";

async function getCategory(slug: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from("categories").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!data) return null;
  const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "published").eq("category_id", (data as Category).id);
  return { category: data as Category, count: count ?? 0 };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const res = await getCategory(slug);
  if (!res) return { title: "Categoria não encontrada" };
  return {
    title: `${res.category.name} — presentes e produtos`,
    description: res.category.description ?? `Produtos da categoria ${res.category.name} em lojas locais e marketplaces parceiros.`,
    alternates: { canonical: `/categoria/${slug}` },
    // categoria sem produtos não é indexada (evita páginas vazias)
    robots: res.count === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<CatalogSearchParams> }) {
  const { slug } = await params;
  const res = await getCategory(slug);
  if (!res) notFound();
  return <CatalogView sp={await searchParams} basePath={`/categoria/${slug}`} forcedCategory={slug} title={res.category.name} intro={res.category.description ?? undefined} />;
}
