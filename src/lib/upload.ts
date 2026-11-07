import "server-only";
import type { ServerSupabase } from "@/lib/supabase/server";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, { ext: string; check: (b: Uint8Array) => boolean }> = {
  "image/jpeg": { ext: "jpg", check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { ext: "png", check: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  "image/webp": {
    ext: "webp",
    check: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
};

export type UploadResult = { ok: true; url: string | null } | { ok: false; message: string };

/**
 * Valida (tipo declarado + assinatura real do arquivo + tamanho) e envia a imagem
 * para o bucket product-images/<userId>/... com a sessão do usuário (políticas do Storage).
 * Sem arquivo → { ok: true, url: null }.
 */
export async function uploadImage(supabase: ServerSupabase, userId: string, file: FormDataEntryValue | null): Promise<UploadResult> {
  if (!file || typeof file === "string" || file.size === 0) return { ok: true, url: null };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, message: "A imagem deve ter no máximo 5 MB." };
  const spec = TYPES[file.type];
  if (!spec) return { ok: false, message: "Formato de imagem não permitido. Use JPG, PNG ou WEBP." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!spec.check(bytes)) return { ok: false, message: "O arquivo enviado não é uma imagem válida." };
  const path = `${userId}/${crypto.randomUUID()}.${spec.ext}`;
  const { error } = await supabase.storage.from("product-images").upload(path, bytes, { contentType: file.type, upsert: false, cacheControl: "31536000" });
  if (error) return { ok: false, message: "Falha ao enviar a imagem." };
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
