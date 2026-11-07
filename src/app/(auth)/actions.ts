"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";
import { clientIpFrom, isHoneypotTripped, rateLimit } from "@/lib/rate-limit";
import { firstError, formToObject, signInSchema, signUpSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/types";

function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ip = clientIpFrom(await headers());
  if (!rateLimit(`login:${ip}`, 10, 10 * 60_000)) return { ok: false, message: "Muitas tentativas. Aguarde alguns minutos." };
  const parsed = signInSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Serviço de login ainda não configurado." };
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (/confirm/i.test(error.message)) return { ok: false, message: "Confirme seu e-mail antes de entrar (verifique a caixa de entrada)." };
    return { ok: false, message: "E-mail ou senha incorretos." };
  }
  redirect(safeNext(formData.get("next")));
}

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Proteções contra cadastro abusivo: campo-isca, tempo mínimo de preenchimento e limite por IP.
  if (isHoneypotTripped(formData)) return { ok: false, message: "Não foi possível concluir o cadastro." };
  const startedAt = Number(formData.get("started_at"));
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < 2500) {
    return { ok: false, message: "Envio muito rápido. Confira os dados e tente novamente." };
  }
  const ip = clientIpFrom(await headers());
  if (!rateLimit(`signup:${ip}`, 5, 60 * 60_000)) return { ok: false, message: "Muitos cadastros a partir desta conexão. Tente mais tarde." };

  const parsed = signUpSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Serviço de cadastro ainda não configurado." };

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback?next=${parsed.data.account_type === "lojista" ? "/painel/loja" : "/minhas-listas"}`,
      // o papel 'admin' nunca é aceito aqui: o banco só reconhece 'lojista' ou 'cliente'
      data: { full_name: parsed.data.full_name, account_type: parsed.data.account_type },
    },
  });
  if (error) {
    if (/registered|already/i.test(error.message)) return { ok: false, message: "Este e-mail já possui cadastro." };
    if (/password/i.test(error.message)) return { ok: false, message: "Senha fraca. Use pelo menos 8 caracteres, misturando letras e números." };
    return { ok: false, message: "Não foi possível concluir o cadastro agora." };
  }
  if (data.session) redirect(parsed.data.account_type === "lojista" ? "/painel/loja" : "/minhas-listas");
  return { ok: true, message: "Cadastro recebido! Enviamos um link de confirmação para o seu e-mail." };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/");
}

export async function requestPasswordResetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ip = clientIpFrom(await headers());
  if (!rateLimit(`reset:${ip}`, 5, 60 * 60_000)) return { ok: false, message: "Muitas tentativas. Aguarde alguns minutos." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "E-mail inválido." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Serviço ainda não configurado." };
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${SITE_URL}/auth/callback?next=/nova-senha` });
  // Mesma resposta exista ou não a conta, para não revelar quais e-mails têm cadastro.
  return { ok: true, message: "Se esse e-mail tiver cadastro, enviamos um link para criar uma nova senha." };
}

export async function updatePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8 || password.length > 72) return { ok: false, message: "A senha deve ter pelo menos 8 caracteres." };
  if (password !== confirm) return { ok: false, message: "As senhas não são iguais." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Serviço ainda não configurado." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "O link expirou. Peça um novo em Esqueci minha senha." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, message: /same|different/i.test(error.message) ? "Use uma senha diferente da anterior." : "Não foi possível trocar a senha agora." };
  redirect("/?senha=alterada");
}
