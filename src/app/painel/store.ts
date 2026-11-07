import "server-only";
import type { Session } from "@/lib/auth";
import type { Store } from "@/lib/types";

export async function getMyStore(s: Session): Promise<Store | null> {
  const { data } = await s.supabase.from("stores").select("*").eq("owner_id", s.userId).order("created_at").limit(1).maybeSingle();
  return (data as Store) ?? null;
}
