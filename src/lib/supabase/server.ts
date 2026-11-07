import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/env";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Usa a sessão do usuário (cookies) e a chave ANON — as políticas RLS se aplicam.
 * Retorna null quando o Supabase ainda não foi configurado (build sem variáveis).
 */
export async function createClient() {
  // ler cookies primeiro marca a rota como dinâmica mesmo sem variáveis de ambiente
  // (evita que páginas privadas sejam pré-renderizadas no build)
  const cookieStore = await cookies();
  if (!isSupabaseConfigured()) return null;
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components não podem gravar cookies; o proxy renova a sessão.
        }
      },
    },
  });
}

export type ServerSupabase = NonNullable<Awaited<ReturnType<typeof createClient>>>;
