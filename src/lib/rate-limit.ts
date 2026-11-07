/**
 * Limitador simples em memória (janela deslizante) por chave (ex.: IP + ação).
 * Observação: em ambiente serverless cada instância tem sua própria memória;
 * é uma camada extra — as regras críticas (reservas) também são limitadas no banco.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const list = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    buckets.set(key, list);
    return false;
  }
  list.push(now);
  buckets.set(key, list);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return true;
}

export function clientIpFrom(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}

/** Campo-isca: deve chegar vazio. */
export function isHoneypotTripped(formData: FormData, field = "website"): boolean {
  const v = formData.get(field);
  return typeof v === "string" && v.trim().length > 0;
}
