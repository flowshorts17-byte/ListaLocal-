import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

/**
 * Cliente com SERVICE ROLE (ignora RLS). Uso EXCLUSIVO no servidor e apenas
 * em rotinas internas (ex.: cron de expiração de reservas).
 * A chave nunca é prefixada com NEXT_PUBLIC_, logo não vai para o navegador.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
