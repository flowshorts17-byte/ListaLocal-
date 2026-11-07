import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Banner, Category, ProductWithRelations, Store } from "@/lib/types";

export const PRODUCT_SELECT =
  "*, category:categories(name,slug), store:stores(name,slug,city,state,whatsapp,is_demo), program:affiliate_programs(marketplace_name)";

export const PAGE_SIZE = 24;

export type CatalogFilters = {
  q?: string;
  categoria?: string;
  cidade?: string;
  tipo?: "local" | "affiliate";
  ordem?: "preco-asc" | "preco-desc" | "recentes";
  pagina?: number;
  loja?: string; // store id
};

function escapeLike(v: string) {
  return v.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order").order("name");
  return (data as Category[]) ?? [];
}

export async function getCities(): Promise<string[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase.from("stores").select("city").eq("status", "approved").limit(1000);
  return Array.from(new Set(((data as { city: string }[]) ?? []).map((s) => s.city))).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function getBanners(): Promise<Banner[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase.from("banners").select("*").order("sort_order").limit(3);
  return (data as Banner[]) ?? [];
}

export async function getProducts(filters: CatalogFilters = {}, limit = PAGE_SIZE) {
  const supabase = await createClient();
  if (!supabase) return { items: [] as ProductWithRelations[], total: 0 };

  let query = supabase.from("products").select(PRODUCT_SELECT, { count: "exact" }).eq("status", "published");

  if (filters.tipo) query = query.eq("product_type", filters.tipo);
  if (filters.loja) query = query.eq("store_id", filters.loja);
  if (filters.q) {
    const q = filters.q.trim().slice(0, 80);
    if (q) query = query.ilike("name", `%${escapeLike(q)}%`);
  }
  if (filters.categoria) {
    const { data: cat } = await supabase.from("categories").select("id").eq("slug", filters.categoria).maybeSingle();
    if (!cat) return { items: [], total: 0 };
    query = query.eq("category_id", (cat as { id: string }).id);
  }
  if (filters.cidade) {
    const { data: stores } = await supabase.from("stores").select("id").eq("status", "approved").eq("city", filters.cidade);
    const ids = ((stores as { id: string }[]) ?? []).map((s) => s.id);
    if (ids.length === 0) return { items: [], total: 0 };
    query = query.in("store_id", ids);
  }

  if (filters.ordem === "preco-asc") query = query.order("price_cents", { ascending: true });
  else if (filters.ordem === "preco-desc") query = query.order("price_cents", { ascending: false });
  else query = query.order("is_featured", { ascending: false }).order("published_at", { ascending: false, nullsFirst: false });

  const page = Math.max(1, Math.min(filters.pagina ?? 1, 500));
  const from = (page - 1) * limit;
  const { data, count } = await query.range(from, from + limit - 1);
  return { items: (data as ProductWithRelations[]) ?? [], total: count ?? 0 };
}

export async function getFeaturedProducts(limit = 8): Promise<ProductWithRelations[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "published")
    .eq("is_featured", true)
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data as ProductWithRelations[]) ?? [];
}

export async function getPopularProducts(limit = 8): Promise<ProductWithRelations[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data: ranked } = await supabase.rpc("popular_product_ids", { p_limit: limit });
  const ids = ((ranked as { product_id: string }[]) ?? []).map((r) => r.product_id);
  if (ids.length === 0) return [];
  const { data } = await supabase.from("products").select(PRODUCT_SELECT).in("id", ids);
  const byId = new Map(((data as ProductWithRelations[]) ?? []).map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as ProductWithRelations[];
}

/** Sugestões de presentes: produtos publicados até R$ 200, mais recentes. */
export async function getGiftSuggestions(limit = 4): Promise<ProductWithRelations[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "published")
    .neq("availability", "unavailable")
    .lte("price_cents", 20000)
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data as ProductWithRelations[]) ?? [];
}

export async function getProductBySlug(slug: string): Promise<ProductWithRelations | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from("products").select(PRODUCT_SELECT).eq("slug", slug).eq("status", "published").maybeSingle();
  return (data as ProductWithRelations) ?? null;
}

export async function getStores(limit = 60): Promise<Store[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase.from("stores").select("*").eq("status", "approved").order("name").limit(limit);
  return (data as Store[]) ?? [];
}

export async function getStoreBySlug(slug: string): Promise<Store | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from("stores").select("*").eq("slug", slug).eq("status", "approved").maybeSingle();
  return (data as Store) ?? null;
}
