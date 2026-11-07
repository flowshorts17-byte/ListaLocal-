import "server-only";
import { cookies, headers } from "next/headers";
import { isLikelyBot } from "@/lib/click-redirect";

export const CONSENT_COOKIE = "ll_consent";
export const SESSION_COOKIE = "ll_sid";

/**
 * Contexto de rastreamento respeitando a LGPD: identificador de sessão anônimo
 * e origem (referrer) SÓ são enviados quando o visitante aceitou cookies de métricas.
 */
export async function trackingContext() {
  const c = await cookies();
  const h = await headers();
  const consent = c.get(CONSENT_COOKIE)?.value === "all";
  const sid = c.get(SESSION_COOKIE)?.value;
  return {
    consent,
    sessionId: consent && sid && /^[a-zA-Z0-9-]{8,64}$/.test(sid) ? sid : null,
    referrer: consent ? (h.get("referer")?.slice(0, 500) ?? null) : null,
    isBot: isLikelyBot(h.get("user-agent")),
  };
}
