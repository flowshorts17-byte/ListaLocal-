"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sessionForAction } from "@/lib/auth";
import { uniqueSlug } from "@/lib/slug";
import { firstError, formToObject, giftListSchema, uuidSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/types";

const LOGIN_MSG = { ok: false, message: "Entre na sua conta para continuar." } as const;

export async function createListAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const s = await sessionForAction();
  if (!s) return LOGIN_MSG;
  const parsed = giftListSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const { data, error } = await s.supabase
    .from("gift_lists")
    .insert({ ...parsed.data, is_public: true, owner_id: s.userId, slug: uniqueSlug(parsed.data.title) })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: "Não foi possível criar a lista." };
  redirect(`/minhas-listas/${(data as { id: string }).id}`);
}

export async function updateListAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const s = await sessionForAction();
  if (!s) return LOGIN_MSG;
  const id = uuidSchema.safeParse(formData.get("id"));
  const parsed = giftListSchema.safeParse(formToObject(formData));
  if (!id.success) return { ok: false, message: "Lista inválida." };
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const status = formData.get("status") === "closed" ? "closed" : "active";
  const { error, count } = await s.supabase
    .from("gift_lists")
    .update({ ...parsed.data, status }, { count: "exact" })
    .eq("id", id.data)
    .eq("owner_id", s.userId);
  if (error || !count) return { ok: false, message: "Não foi possível salvar." };
  revalidatePath(`/minhas-listas/${id.data}`);
  return { ok: true, message: "Lista atualizada." };
}

export async function addToListAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const s = await sessionForAction();
  if (!s) return LOGIN_MSG;
  const listId = uuidSchema.safeParse(formData.get("list_id"));
  const productId = uuidSchema.safeParse(formData.get("product_id"));
  if (!listId.success || !productId.success) return { ok: false, message: "Dados inválidos." };
  const qty = Math.min(50, Math.max(1, Number.parseInt(String(formData.get("quantity") ?? "1"), 10) || 1));
  const { error } = await s.supabase
    .from("gift_list_items")
    .insert({ gift_list_id: listId.data, product_id: productId.data, quantity_desired: qty });
  if (error) {
    if (error.code === "23505") return { ok: false, message: "Este produto já está na lista." };
    return { ok: false, message: "Não foi possível adicionar o produto." };
  }
  revalidatePath(`/minhas-listas/${listId.data}`);
  return { ok: true, message: "Produto adicionado à lista." };
}

export async function removeItemAction(formData: FormData) {
  const s = await sessionForAction();
  if (!s) return;
  const itemId = uuidSchema.safeParse(formData.get("item_id"));
  const listId = uuidSchema.safeParse(formData.get("list_id"));
  if (!itemId.success || !listId.success) return;
  // itens com reservas ou vendas registradas não são apagados (restrição no banco preserva o histórico)
  await s.supabase.from("gift_list_items").delete().eq("id", itemId.data).eq("gift_list_id", listId.data);
  revalidatePath(`/minhas-listas/${listId.data}`);
}

export async function updateItemQtyAction(formData: FormData) {
  const s = await sessionForAction();
  if (!s) return;
  const itemId = uuidSchema.safeParse(formData.get("item_id"));
  const listId = uuidSchema.safeParse(formData.get("list_id"));
  if (!itemId.success || !listId.success) return;
  const qty = Math.min(50, Math.max(1, Number.parseInt(String(formData.get("quantity") ?? "1"), 10) || 1));
  await s.supabase.from("gift_list_items").update({ quantity_desired: qty }).eq("id", itemId.data).eq("gift_list_id", listId.data);
  revalidatePath(`/minhas-listas/${listId.data}`);
}
