"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clientIpFrom, isHoneypotTripped, rateLimit } from "@/lib/rate-limit";
import { firstError, formToObject, reportPurchaseSchema, reservationSchema } from "@/lib/validation";
import { formatDate } from "@/lib/format";
import type { ActionState } from "@/lib/types";

/** Reserva temporária de item local. Toda a regra de concorrência está no banco. */
export async function reserveAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (isHoneypotTripped(formData)) return { ok: false, message: "Não foi possível concluir a reserva." };
  const ip = clientIpFrom(await headers());
  if (!rateLimit(`reserve:${ip}`, 8, 60 * 60_000)) return { ok: false, message: "Muitas reservas a partir desta conexão. Tente mais tarde." };
  const parsed = reservationSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Serviço indisponível." };
  const { data, error } = await supabase.rpc("reserve_gift_item", {
    p_item_id: parsed.data.item_id,
    p_guest_name: parsed.data.guest_name,
    p_guest_phone: parsed.data.guest_phone,
    p_message: parsed.data.guest_message,
    p_quantity: 1,
  });
  if (error) return { ok: false, message: error.code === "P0001" ? error.message : "Não foi possível reservar agora." };
  const row = (data as { expires_at: string }[] | null)?.[0];
  const slug = formData.get("slug");
  if (typeof slug === "string") revalidatePath(`/lista/${slug}`);
  return {
    ok: true,
    message: `Reserva registrada! Ela vale até ${row ? formatDate(row.expires_at, true) : "48 horas"}. A loja confirmará pelo telefone informado.`,
  };
}

/** Convidado informa que comprou um item afiliado (não verificado). */
export async function reportPurchaseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (isHoneypotTripped(formData)) return { ok: false, message: "Não foi possível registrar." };
  const ip = clientIpFrom(await headers());
  if (!rateLimit(`report:${ip}`, 10, 60 * 60_000)) return { ok: false, message: "Muitas marcações a partir desta conexão. Tente mais tarde." };
  const parsed = reportPurchaseSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Serviço indisponível." };
  const { error } = await supabase.rpc("report_affiliate_purchase", {
    p_item_id: parsed.data.item_id,
    p_guest_name: parsed.data.guest_name,
    p_message: parsed.data.guest_message,
  });
  if (error) return { ok: false, message: error.code === "P0001" ? error.message : "Não foi possível registrar agora." };
  const slug = formData.get("slug");
  if (typeof slug === "string") revalidatePath(`/lista/${slug}`);
  return { ok: true, message: "Obrigado! Avisamos o organizador que você informou esta compra." };
}
