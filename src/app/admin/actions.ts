"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sessionForAction } from "@/lib/auth";
import { saveProduct } from "@/lib/product-save";
import { slugify, uniqueSlug } from "@/lib/slug";
import { parseBRLToCents } from "@/lib/format";
import {
  affiliateProgramSchema,
  bannerSchema,
  categorySchema,
  firstError,
  formToObject,
  storeSchema,
  uuidSchema,
} from "@/lib/validation";
import type { ActionState } from "@/lib/types";

const DENIED = { ok: false, message: "Acesso restrito ao administrador." } as const;
const admin = () => sessionForAction(["admin"]);
const id = (fd: FormData, key = "id") => {
  const r = uuidSchema.safeParse(fd.get(key));
  return r.success ? r.data : null;
};

// ---------- Usuários ----------
export async function setUserRoleAction(fd: FormData) {
  const s = await admin();
  const uid = id(fd);
  const role = String(fd.get("role"));
  if (!s || !uid || !["admin", "lojista", "cliente"].includes(role)) return;
  if (uid === s.userId) return; // evita remover o próprio acesso por engano
  await s.supabase.from("users").update({ role }).eq("id", uid);
  revalidatePath("/admin/usuarios");
}
export async function toggleUserActiveAction(fd: FormData) {
  const s = await admin();
  const uid = id(fd);
  if (!s || !uid || uid === s.userId) return;
  await s.supabase.from("users").update({ is_active: fd.get("value") === "true" }).eq("id", uid);
  revalidatePath("/admin/usuarios");
}

// ---------- Lojas ----------
export async function setStoreStatusAction(fd: FormData) {
  const s = await admin();
  const sid = id(fd);
  const status = String(fd.get("status"));
  if (!s || !sid || !["pending", "approved", "rejected", "suspended"].includes(status)) return;
  await s.supabase.from("stores").update({ status }).eq("id", sid);
  revalidatePath("/admin/lojas");
}
export async function createStoreAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const s = await admin();
  if (!s) return DENIED;
  const parsed = storeSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  let ownerId: string | null = null;
  const email = String(fd.get("owner_email") ?? "").trim().toLowerCase();
  if (email) {
    const { data } = await s.supabase.from("users").select("id, role").eq("email", email).maybeSingle();
    if (!data) return { ok: false, message: "Nenhum usuário com este e-mail." };
    ownerId = (data as { id: string }).id;
    if ((data as { role: string }).role === "cliente") await s.supabase.from("users").update({ role: "lojista" }).eq("id", ownerId);
  }
  const { error } = await s.supabase.from("stores").insert({ ...parsed.data, owner_id: ownerId, slug: uniqueSlug(parsed.data.name), status: "approved" });
  if (error) return { ok: false, message: "Não foi possível cadastrar a loja." };
  revalidatePath("/admin/lojas");
  return { ok: true, message: "Loja cadastrada e aprovada." };
}

// ---------- Produtos ----------
export async function saveAdminProductAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const s = await admin();
  if (!s) return DENIED;
  const res = await saveProduct(s, fd, { isAdmin: true });
  if (!res.ok) return res;
  revalidatePath("/admin/produtos");
  if (!fd.get("id")) redirect(`/admin/produtos/${res.id}?criado=1`);
  return { ok: true, message: "Produto salvo." };
}
export async function adminQuickProductAction(fd: FormData) {
  const s = await admin();
  const pid = id(fd);
  const field = String(fd.get("field"));
  const value = String(fd.get("value"));
  if (!s || !pid) return;
  if (field === "status" && ["draft", "published", "archived"].includes(value)) {
    await s.supabase.from("products").update({ status: value }).eq("id", pid);
  } else if (field === "is_featured") {
    await s.supabase.from("products").update({ is_featured: value === "true" }).eq("id", pid);
  }
  revalidatePath("/admin/produtos");
}

// ---------- Categorias ----------
export async function saveCategoryAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const s = await admin();
  if (!s) return DENIED;
  const parsed = categorySchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const cid = id(fd);
  const { error } = cid
    ? await s.supabase.from("categories").update(parsed.data).eq("id", cid)
    : await s.supabase.from("categories").insert({ ...parsed.data, slug: slugify(parsed.data.name) });
  if (error) return { ok: false, message: error.code === "23505" ? "Já existe categoria com este nome." : "Não foi possível salvar." };
  revalidatePath("/admin/categorias");
  return { ok: true, message: "Categoria salva." };
}
export async function toggleCategoryAction(fd: FormData) {
  const s = await admin();
  const cid = id(fd);
  if (!s || !cid) return;
  await s.supabase.from("categories").update({ is_active: fd.get("value") === "true" }).eq("id", cid);
  revalidatePath("/admin/categorias");
}

// ---------- Programas de afiliados ----------
export async function saveProgramAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const s = await admin();
  if (!s) return DENIED;
  const parsed = affiliateProgramSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const { error } = await s.supabase.from("affiliate_programs").insert({ ...parsed.data, slug: uniqueSlug(parsed.data.name), is_active: true });
  if (error) return { ok: false, message: "Não foi possível salvar o programa." };
  revalidatePath("/admin/afiliados");
  return { ok: true, message: "Programa cadastrado." };
}
export async function toggleProgramAction(fd: FormData) {
  const s = await admin();
  const pid = id(fd);
  if (!s || !pid) return;
  await s.supabase.from("affiliate_programs").update({ is_active: fd.get("value") === "true" }).eq("id", pid);
  revalidatePath("/admin/afiliados");
}

// ---------- Banners ----------
export async function saveBannerAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const s = await admin();
  if (!s) return DENIED;
  const parsed = bannerSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const { error } = await s.supabase.from("banners").insert(parsed.data);
  if (error) return { ok: false, message: "Não foi possível salvar o banner." };
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { ok: true, message: "Banner criado." };
}
export async function toggleBannerAction(fd: FormData) {
  const s = await admin();
  const bid = id(fd);
  if (!s || !bid) return;
  if (fd.get("delete") === "1") await s.supabase.from("banners").delete().eq("id", bid);
  else await s.supabase.from("banners").update({ is_active: fd.get("value") === "true" }).eq("id", bid);
  revalidatePath("/admin/banners");
  revalidatePath("/");
}

// ---------- Vendas e comissões ----------
export async function registerSaleAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const s = await admin();
  if (!s) return DENIED;
  const pid = id(fd, "product_id");
  if (!pid) return { ok: false, message: "Selecione o produto." };
  const qty = Math.min(100, Math.max(1, Number.parseInt(String(fd.get("quantity") ?? "1"), 10) || 1));
  const { data: prod } = await s.supabase.from("products").select("id, product_type, store_id, affiliate_program_id, price_cents").eq("id", pid).maybeSingle();
  if (!prod) return { ok: false, message: "Produto não encontrado." };
  const p = prod as { product_type: "local" | "affiliate"; store_id: string | null; affiliate_program_id: string | null; price_cents: number };
  // valor: o informado pelo admin (ex.: valor do relatório) ou, se vazio, preço do banco × quantidade
  const typed = parseBRLToCents(String(fd.get("amount") ?? ""));
  const source = p.product_type === "affiliate" && fd.get("source") === "affiliate_report" ? "affiliate_report" : "admin_confirmed";
  const { error } = await s.supabase.from("purchases").insert({
    product_id: pid,
    product_type: p.product_type,
    store_id: p.store_id,
    affiliate_program_id: p.affiliate_program_id,
    source,
    verification_status: "verified",
    quantity: qty,
    amount_cents: typed ?? p.price_cents * qty,
    buyer_name: String(fd.get("buyer_name") ?? "").trim().slice(0, 80) || null,
    notes: String(fd.get("notes") ?? "").trim().slice(0, 500) || null,
    verified_at: new Date().toISOString(),
    verified_by: s.userId,
  });
  if (error) return { ok: false, message: "Não foi possível registrar a venda." };
  revalidatePath("/admin/vendas");
  return { ok: true, message: "Venda confirmada registrada." };
}
export async function setPurchaseStatusAction(fd: FormData) {
  const s = await admin();
  const pid = id(fd);
  const status = String(fd.get("status"));
  if (!s || !pid || !["verified", "rejected"].includes(status)) return;
  if (status === "verified") {
    // venda informada pelo convidado só vira "verificada" com confirmação do admin
    await s.supabase.from("purchases").update({ verification_status: "verified", source: "admin_confirmed", verified_at: new Date().toISOString(), verified_by: s.userId }).eq("id", pid);
  } else {
    await s.supabase.from("purchases").update({ verification_status: "rejected" }).eq("id", pid);
  }
  revalidatePath("/admin/vendas");
}
export async function registerCommissionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const s = await admin();
  if (!s) return DENIED;
  const amount = parseBRLToCents(String(fd.get("amount") ?? ""));
  if (amount === null) return { ok: false, message: "Valor inválido." };
  const status = String(fd.get("status"));
  if (!["estimated", "approved", "rejected", "paid"].includes(status)) return { ok: false, message: "Status inválido." };
  const programId = id(fd, "affiliate_program_id");
  const month = String(fd.get("reference_month") ?? "");
  const { error } = await s.supabase.from("commissions").insert({
    affiliate_program_id: programId,
    amount_cents: amount,
    status,
    reference_month: /^\d{4}-\d{2}$/.test(month) ? `${month}-01` : null,
    external_reference: String(fd.get("external_reference") ?? "").trim().slice(0, 120) || null,
    notes: String(fd.get("notes") ?? "").trim().slice(0, 500) || null,
    approved_at: status === "approved" || status === "paid" ? new Date().toISOString() : null,
    created_by: s.userId,
  });
  if (error) return { ok: false, message: "Não foi possível registrar a comissão." };
  revalidatePath("/admin/vendas");
  return { ok: true, message: "Comissão registrada." };
}
export async function setCommissionStatusAction(fd: FormData) {
  const s = await admin();
  const cid = id(fd);
  const status = String(fd.get("status"));
  if (!s || !cid || !["estimated", "approved", "rejected", "paid"].includes(status)) return;
  await s.supabase
    .from("commissions")
    .update({ status, approved_at: status === "approved" || status === "paid" ? new Date().toISOString() : null })
    .eq("id", cid);
  revalidatePath("/admin/vendas");
}

// ---------- Listas ----------
export async function setListStatusAction(fd: FormData) {
  const s = await admin();
  const lid = id(fd);
  const status = String(fd.get("status"));
  if (!s || !lid || !["active", "closed", "archived"].includes(status)) return;
  await s.supabase.from("gift_lists").update({ status }).eq("id", lid);
  revalidatePath("/admin/listas");
}
