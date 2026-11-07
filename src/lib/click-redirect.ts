/**
 * Decide o destino de um clique em "COMPRAR" a partir do registro devolvido
 * pelo banco (função register_product_click). Função pura e testável.
 * O destino NUNCA vem de parâmetros do navegador.
 */
import { buildWhatsappUrl } from "./whatsapp";

export type ClickRow = {
  product_type: "local" | "affiliate";
  product_name: string;
  product_slug: string;
  whatsapp: string | null;
  affiliate_url: string | null;
  is_demo: boolean | null;
};

export type ClickKind = "whatsapp" | "affiliate";

export type RedirectDecision =
  | { type: "external"; url: string }
  | { type: "internal"; path: string; reason: "not_found" | "wrong_type" | "demo" | "invalid_target" };

/** Aceita somente https:// com host válido, sem credenciais embutidas. */
export function isSafeExternalUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (!url.hostname || !url.hostname.includes(".")) return false;
  if (url.username || url.password) return false;
  return true;
}

export function decideClickRedirect(row: ClickRow | null | undefined, kind: ClickKind): RedirectDecision {
  if (!row) return { type: "internal", path: "/catalogo", reason: "not_found" };
  const productPath = `/produto/${row.product_slug}`;

  if (kind === "whatsapp") {
    if (row.product_type !== "local") return { type: "internal", path: productPath, reason: "wrong_type" };
    if (row.is_demo) return { type: "internal", path: `${productPath}?demo=1`, reason: "demo" };
    const url = buildWhatsappUrl(row.whatsapp, row.product_name);
    if (!url) return { type: "internal", path: productPath, reason: "invalid_target" };
    return { type: "external", url };
  }

  if (row.product_type !== "affiliate") return { type: "internal", path: productPath, reason: "wrong_type" };
  if (row.is_demo) return { type: "internal", path: `${productPath}?demo=1`, reason: "demo" };
  if (!isSafeExternalUrl(row.affiliate_url)) return { type: "internal", path: productPath, reason: "invalid_target" };
  return { type: "external", url: row.affiliate_url! };
}

const BOT_UA = /bot|crawler|spider|crawling|slurp|facebookexternalhit|whatsapp|telegrambot|preview|headless|lighthouse/i;

/** Robôs e pré-visualizações de link não contam como clique. */
export function isLikelyBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  return BOT_UA.test(userAgent);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: string | null | undefined): v is string {
  return !!v && UUID_RE.test(v);
}
