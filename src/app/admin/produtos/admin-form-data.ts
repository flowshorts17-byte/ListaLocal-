import "server-only";
import type { Session } from "@/lib/auth";
import { getCategories } from "@/lib/data";
import type { AffiliateProgram, Store } from "@/lib/types";

export async function adminFormData(s: Session) {
  const [categories, { data: stores }, { data: programs }] = await Promise.all([
    getCategories(),
    s.supabase.from("stores").select("id, name, city").order("name"),
    s.supabase.from("affiliate_programs").select("id, name, marketplace_name").order("marketplace_name"),
  ]);
  return {
    categories,
    stores: (stores as Pick<Store, "id" | "name" | "city">[]) ?? [],
    programs: (programs as Pick<AffiliateProgram, "id" | "name" | "marketplace_name">[]) ?? [],
  };
}
