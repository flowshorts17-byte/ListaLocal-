import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decideClickRedirect, isUuid, type ClickKind, type ClickRow } from "@/lib/click-redirect";
import { trackingContext } from "@/lib/tracking";

/**
 * Trata GET /w/[id] (WhatsApp) e /r/[id] (afiliado):
 * 1) registra o clique no banco (função register_product_click);
 * 2) redireciona para o destino OFICIAL vindo do banco.
 */
export async function handleClick(request: NextRequest, productId: string, kind: ClickKind) {
  const origin = new URL(request.url).origin;
  const noStore = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
  if (!isUuid(productId)) return NextResponse.redirect(`${origin}/catalogo`, { status: 302, headers: noStore });

  const supabase = await createClient();
  if (!supabase) return NextResponse.redirect(`${origin}/catalogo`, { status: 302, headers: noStore });

  const sp = request.nextUrl.searchParams;
  const listId = sp.get("lista");
  const ctx = await trackingContext();
  const clip = (v: string | null) => (v ? v.slice(0, 100) : null);

  let row: ClickRow | null = null;
  if (ctx.isBot) {
    // robôs/pré-visualizações não contam como clique: apenas lê o destino público
    const { data } = await supabase
      .from("products")
      .select("product_type, name, slug, affiliate_url, is_demo, store:stores(whatsapp,is_demo)")
      .eq("id", productId)
      .eq("status", "published")
      .maybeSingle();
    if (data) {
      const d = data as unknown as { product_type: "local" | "affiliate"; name: string; slug: string; affiliate_url: string | null; is_demo: boolean; store: { whatsapp: string; is_demo: boolean } | null };
      const demo = d.is_demo || !!d.store?.is_demo;
      row = { product_type: d.product_type, product_name: d.name, product_slug: d.slug, whatsapp: demo ? null : (d.store?.whatsapp ?? null), affiliate_url: demo ? null : d.affiliate_url, is_demo: demo };
    }
  } else {
    const { data, error } = await supabase.rpc("register_product_click", {
      p_product_id: productId,
      p_gift_list_id: isUuid(listId) ? listId : null,
      p_session_id: ctx.sessionId,
      p_referrer: ctx.referrer,
      p_utm_source: ctx.consent ? clip(sp.get("utm_source")) : null,
      p_utm_medium: ctx.consent ? clip(sp.get("utm_medium")) : null,
      p_utm_campaign: ctx.consent ? clip(sp.get("utm_campaign")) : null,
    });
    if (error) console.error("register_product_click", error.message);
    row = ((data as ClickRow[] | null) ?? [])[0] ?? null;
  }

  const decision = decideClickRedirect(row, kind);
  if (decision.type === "external") return NextResponse.redirect(decision.url, { status: 302, headers: noStore });
  return NextResponse.redirect(`${origin}${decision.path}`, { status: 302, headers: noStore });
}
