"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sessionForAction } from "@/lib/auth";
import { saveProduct } from "@/lib/product-save";
import { uniqueSlug } from "@/lib/slug";
import { uploadImage } from "@/lib/upload";
import { firstError, formToObject, storeSchema, uuidSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/types";
import { getMyStore } from "./store";

const DENIED = { ok: false, message: "Acesso negado." } as const;

export async function saveStoreAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const s = await sessionForAction(["lojista"]);
  if (!s) return DENIED;
  const parsed = storeSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const logo = await uploadImage(s.supabase, s.userId, fd.get("logo"));
  if (!logo.ok) return logo;

  const current = await getMyStore(s);
  const payload: Record<string, unknown> = { ...parsed.data };
  if (logo.url) payload.logo_url = logo.url;

  if (current) {
    const { error } = await s.supabase.from("stores").update(payload).eq("id", current.id);
    if (error) return { ok: false, message: "Não foi possível salvar a loja." };
    revalidatePath("/painel", "layout");
    return { ok: true, message: "Dados da loja atualizados." };
  }
  const { error } = await s.supabase.from("stores").insert({ ...payload, owner_id: s.userId, slug: uniqueSlug(parsed.data.name) });
  if (error) return { ok: false, message: "Não foi possível cadastrar a loja." };
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Loja cadastrada! Ela ficará visível após a aprovação da equipe Mimoa." };
}

export async function saveMyProductAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const s = await sessionForAction(["lojista"]);
  if (!s) return DENIED;
  const store = await getMyStore(s);
  if (!store) return { ok: false, message: "Cadastre sua loja antes de cadastrar produtos." };
  const res = await saveProduct(s, fd, { isAdmin: false, forcedStoreId: store.id });
  if (!res.ok) return res;
  revalidatePath("/painel/produtos");
  if (!fd.get("id")) redirect(`/painel/produtos/${res.id}?criado=1`);
  return { ok: true, message: "Produto salvo." };
}

/** Ações rápidas: disponibilidade e publicação. */
export async function quickProductAction(fd: FormData) {
  const s = await sessionForAction(["lojista"]);
  if (!s) return;
  const id = uuidSchema.safeParse(fd.get("id"));
  if (!id.success) return;
  const field = fd.get("field");
  const value = String(fd.get("value") ?? "");
  const allowed: Record<string, string[]> = {
    availability: ["available", "on_request", "unavailable"],
    status: ["draft", "published", "archived"],
  };
  if (typeof field !== "string" || !allowed[field]?.includes(value)) return;
  await s.supabase.from("products").update({ [field]: value }).eq("id", id.data);
  revalidatePath("/painel/produtos");
}

export async function reservationStatusAction(fd: FormData) {
  const s = await sessionForAction(["lojista", "admin"]);
  if (!s) return;
  const id = uuidSchema.safeParse(fd.get("id"));
  const status = String(fd.get("status"));
  if (!id.success || !["confirmed", "completed", "cancelled"].includes(status)) return;
  await s.supabase.rpc("set_reservation_status", { p_reservation_id: id.data, p_status: status });
  revalidatePath("/painel/reservas");
  revalidatePath("/admin/reservas");
}
