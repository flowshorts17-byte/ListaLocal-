import "server-only";
import { redirect } from "next/navigation";
import { createClient, type ServerSupabase } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

export type Session = { supabase: ServerSupabase; userId: string; email: string | null; profile: Profile | null };

/** Usuário autenticado (validado no servidor do Supabase via getUser) + perfil. */
export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: profile } = await supabase.from("users").select("*").eq("id", data.user.id).maybeSingle();
  return { supabase, userId: data.user.id, email: data.user.email ?? null, profile: (profile as Profile) ?? null };
}

/** Exige login (e opcionalmente um papel). Redireciona quando não autorizado. */
export async function requireSession(roles?: Role[], nextPath = "/"): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(`/entrar?next=${encodeURIComponent(nextPath)}`);
  if (!session.profile || !session.profile.is_active) redirect("/entrar?erro=conta-inativa");
  if (roles && !roles.includes(session.profile.role)) redirect("/?erro=sem-permissao");
  return session;
}

/** Para Server Actions: devolve a sessão ou null (sem redirecionar). */
export async function sessionForAction(roles?: Role[]): Promise<Session | null> {
  const session = await getSession();
  if (!session?.profile?.is_active) return null;
  if (roles && !roles.includes(session.profile.role)) return null;
  return session;
}
