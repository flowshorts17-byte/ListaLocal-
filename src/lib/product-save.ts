import "server-only";
import type { Session } from "@/lib/auth";
import { uniqueSlug } from "@/lib/slug";
import { uploadImage } from "@/lib/upload";
import { affiliateProductSchema, firstError, formToObject, productBaseSchema, uuidSchema } from "@/lib/validation";

type SaveResult = { ok: true; id: string } | { ok: false; message: string };

/**
 * Valida e grava um produto (lojista ou admin). As permissões finais são
 * garantidas pelo banco (RLS + gatilho guard_products_write).
 */
export async function saveProduct(s: Session, fd: FormData, opts: { isAdmin: boolean; forcedStoreId?: string }): Promise<SaveResult> {
  const raw = formToObject(fd);
  const type = opts.isAdmin && raw.product_type === "affiliate" ? "affiliate" : "local";
  const parsed = type === "affiliate" ? affiliateProductSchema.safeParse(raw) : productBaseSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const d = parsed.data;

  const id = raw.id ? uuidSchema.safeParse(raw.id) : null;
  if (id && !id.success) return { ok: false, message: "Produto inválido." };

  let storeId: string | null = null;
  if (type === "local") {
    storeId = opts.forcedStoreId ?? null;
    if (!storeId) {
      const sid = uuidSchema.safeParse(raw.store_id);
      if (!sid.success) return { ok: false, message: "Selecione a loja." };
      storeId = sid.data;
    }
  }

  const upload = await uploadImage(s.supabase, s.userId, fd.get("image"));
  if (!upload.ok) return upload;
  // lojista não define URL externa de imagem: envia arquivo ou mantém a atual
  const imageUrl = upload.url ?? (opts.isAdmin ? d.image_url : null);

  const payload: Record<string, unknown> = {
    product_type: type,
    name: d.name,
    description: d.description,
    price_cents: d.price,
    category_id: d.category_id,
    availability: d.availability,
    status: d.status,
    image_url: imageUrl,
  };
  if (!opts.isAdmin && !upload.url && id?.success) delete payload.image_url; // mantém a imagem atual
  if (type === "local") payload.store_id = storeId;
  if (type === "affiliate") {
    const a = d as typeof d & { affiliate_url: string; affiliate_program_id: string };
    payload.affiliate_url = a.affiliate_url;
    payload.affiliate_program_id = a.affiliate_program_id;
  }
  if (opts.isAdmin) payload.is_featured = raw.is_featured === "on";

  if (id?.success) {
    const { error } = await s.supabase.from("products").update(payload).eq("id", id.data);
    if (error) return { ok: false, message: friendly(error.message) };
    return { ok: true, id: id.data };
  }
  const { data, error } = await s.supabase.from("products").insert({ ...payload, slug: uniqueSlug(d.name) }).select("id").single();
  if (error || !data) return { ok: false, message: friendly(error?.message) };
  return { ok: true, id: (data as { id: string }).id };
}

function friendly(msg?: string) {
  if (!msg) return "Não foi possível salvar o produto.";
  if (/aprovada/.test(msg)) return "A loja precisa ser aprovada antes de publicar produtos.";
  if (/products_type_consistency/.test(msg)) return "Dados incompatíveis com o tipo do produto.";
  if (/row-level security|permiss|permitida/i.test(msg)) return "Sem permissão para esta alteração.";
  return "Não foi possível salvar o produto.";
}
