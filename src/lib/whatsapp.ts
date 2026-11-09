/**
 * Utilitários do botão "COMPRAR PELO WHATSAPP".
 * Funções puras (sem dependência de servidor) — cobertas por testes unitários.
 */

export const WHATSAPP_MESSAGE_PREFIX =
  "Olá! Encontrei este produto no Mimoa e gostaria de saber mais informações:";

/** Mantém apenas dígitos e garante o DDI 55 (Brasil). Retorna null se inválido. */
export function normalizeWhatsapp(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  // número nacional com DDD (10 ou 11 dígitos) → acrescenta 55
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  // formato final: 55 + DDD (sem zero inicial) + celular (9 + 8 dígitos) ou fixo (2-5 + 7 dígitos)
  if (!/^55[1-9][0-9](9[0-9]{8}|[2-5][0-9]{7})$/.test(digits)) return null;
  return digits;
}

/** Mensagem automática enviada à loja. */
export function buildWhatsappMessage(productName: string): string {
  const name = productName.replace(/\s+/g, " ").trim();
  return `${WHATSAPP_MESSAGE_PREFIX} ${name}.`;
}

/** URL oficial wa.me com a mensagem codificada. Retorna null se o número for inválido. */
export function buildWhatsappUrl(phone: string | null | undefined, productName: string): string | null {
  const number = normalizeWhatsapp(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(buildWhatsappMessage(productName))}`;
}

/** Formata para exibição: 5555991234567 → (55) 99123-4567 */
export function formatWhatsappDisplay(phone: string | null | undefined): string {
  const n = normalizeWhatsapp(phone);
  if (!n) return "";
  const ddd = n.slice(2, 4);
  const rest = n.slice(4);
  const split = rest.length === 9 ? 5 : 4;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}
