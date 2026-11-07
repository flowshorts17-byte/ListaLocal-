import { z } from "zod";
import { BR_STATES } from "./labels";
import { parseBRLToCents } from "./format";
import { normalizeWhatsapp } from "./whatsapp";

const trimmed = (min: number, max: number, label: string) =>
  z.string({ error: `${label} é obrigatório.` }).trim().min(min, `${label}: mínimo de ${min} caracteres.`).max(max, `${label}: máximo de ${max} caracteres.`);

const optionalText = (max: number) =>
  z.string().trim().max(max, `Máximo de ${max} caracteres.`).optional().transform((v) => (v ? v : null));

const optionalHttps = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^https:\/\/[^\s]+\.[^\s]+/.test(v), "Use um endereço que comece com https://");

export const uuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Identificador inválido.");

export const priceSchema = z
  .string({ error: "Informe o preço." })
  .transform((v, ctx) => {
    const cents = parseBRLToCents(v);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "Preço inválido. Use o formato 159,90." });
      return z.NEVER;
    }
    return cents;
  });

export const whatsappSchema = z.string({ error: "Informe o WhatsApp." }).transform((v, ctx) => {
  const n = normalizeWhatsapp(v);
  if (!n) {
    ctx.addIssue({ code: "custom", message: "WhatsApp inválido. Informe DDD + número, ex.: (55) 99999-9999." });
    return z.NEVER;
  }
  return n;
});

export const signUpSchema = z.object({
  full_name: trimmed(2, 120, "Nome"),
  email: z.string().trim().toLowerCase().email("E-mail inválido.").max(200),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres.").max(72),
  account_type: z.enum(["cliente", "lojista"]),
  accept_terms: z.literal("on", { error: "É preciso aceitar os Termos de Uso e a Política de Privacidade." }),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
});

export const storeSchema = z.object({
  name: trimmed(2, 100, "Nome da loja"),
  description: optionalText(2000),
  city: trimmed(2, 80, "Cidade"),
  state: z.enum(BR_STATES, { error: "Estado inválido." }),
  address: optionalText(200),
  whatsapp: whatsappSchema,
  instagram: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.replace(/^@/, "") : null))
    .refine((v) => v === null || /^[A-Za-z0-9._]{1,30}$/.test(v), "Instagram inválido."),
});

export const productBaseSchema = z.object({
  name: trimmed(2, 140, "Nome do produto"),
  description: optionalText(5000),
  price: priceSchema,
  category_id: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || uuidSchema.safeParse(v).success, "Categoria inválida."),
  availability: z.enum(["available", "on_request", "unavailable"]),
  status: z.enum(["draft", "published", "archived"]),
  image_url: optionalHttps,
});

export const affiliateProductSchema = productBaseSchema.extend({
  affiliate_program_id: uuidSchema,
  affiliate_url: z
    .string({ error: "Informe o link de afiliado." })
    .trim()
    .min(1, "Informe o link de afiliado.")
    .refine((v) => /^https:\/\/[^\s]+\.[^\s]+/.test(v), "O link de afiliado deve começar com https://"),
});

export const giftListSchema = z.object({
  title: trimmed(3, 120, "Nome do evento"),
  event_type: z.enum(["cha_de_bebe", "cha_de_panela", "casamento", "aniversario", "casa_nova", "outros"], {
    error: "Tipo de evento inválido.",
  }),
  event_date: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida."),
  description: optionalText(1000),
  city: optionalText(80),
  is_public: z
    .string()
    .optional()
    .transform((v) => v === "on"),
});

export const reservationSchema = z.object({
  item_id: uuidSchema,
  guest_name: trimmed(2, 80, "Nome"),
  guest_phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => /^[0-9]{10,13}$/.test(v), "Telefone inválido. Informe DDD + número."),
  guest_message: optionalText(300),
  consent: z.literal("on", { error: "É preciso concordar com o uso dos dados para a reserva." }),
});

export const reportPurchaseSchema = z.object({
  item_id: uuidSchema,
  guest_name: trimmed(2, 80, "Nome"),
  guest_message: optionalText(300),
});

export const categorySchema = z.object({
  name: trimmed(2, 60, "Nome"),
  description: optionalText(500),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
});

export const bannerSchema = z.object({
  title: trimmed(2, 120, "Título"),
  subtitle: optionalText(240),
  image_url: optionalHttps,
  link_url: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^(\/[^\s]*|https:\/\/[^\s]+)$/.test(v), "Use um caminho interno (/catalogo) ou https://"),
  cta_label: optionalText(40),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
});

export const affiliateProgramSchema = z.object({
  name: trimmed(2, 80, "Nome do programa"),
  marketplace_name: trimmed(2, 80, "Marketplace"),
  website_url: optionalHttps,
  terms_url: optionalHttps,
  estimated_commission_pct: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v.replace(",", ".")) : null))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 100), "Percentual inválido."),
  notes: optionalText(1000),
});

/** Converte FormData em objeto simples (somente strings). */
export function formToObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos.";
}
