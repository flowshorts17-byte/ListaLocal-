import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL, SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/env";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = ["", "/catalogo", "/lojas", "/termos", "/privacidade", "/cookies", "/divulgacao-de-afiliados"].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: p === "" || p === "/catalogo" ? "daily" : "monthly",
    priority: p === "" ? 1 : 0.6,
  }));
  if (!isSupabaseConfigured()) return pages;

  // cliente anônimo sem cookies: só enxerga o que é público (RLS)
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const [{ data: products }, { data: stores }, { data: categories }] = await Promise.all([
    supabase.from("products").select("slug, updated_at, category_id").eq("status", "published").eq("is_demo", false).limit(5000),
    supabase.from("stores").select("slug, updated_at").eq("status", "approved").eq("is_demo", false).limit(2000),
    supabase.from("categories").select("id, slug, updated_at").eq("is_active", true),
  ]);
  const prods = (products as { slug: string; updated_at: string; category_id: string | null }[]) ?? [];
  const usedCats = new Set(prods.map((p) => p.category_id));
  return [
    ...pages,
    ...prods.map((p) => ({ url: `${SITE_URL}/produto/${p.slug}`, lastModified: new Date(p.updated_at), priority: 0.8 })),
    ...((stores as { slug: string; updated_at: string }[]) ?? []).map((s) => ({ url: `${SITE_URL}/lojas/${s.slug}`, lastModified: new Date(s.updated_at), priority: 0.7 })),
    // só categorias com produtos (sem páginas vazias)
    ...((categories as { id: string; slug: string; updated_at: string }[]) ?? [])
      .filter((c) => usedCats.has(c.id))
      .map((c) => ({ url: `${SITE_URL}/categoria/${c.slug}`, lastModified: new Date(c.updated_at), priority: 0.7 })),
  ];
}
