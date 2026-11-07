import { describe, expect, it } from "vitest";
import { formatBRL, parseBRLToCents } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { rateLimit } from "@/lib/rate-limit";
import { affiliateProductSchema, reservationSchema, signUpSchema, storeSchema } from "@/lib/validation";

describe("preços (BRL)", () => {
  it.each([
    ["159,90", 15990], ["R$ 1.234,56", 123456], ["10", 1000], ["10.5", 1050], ["0,99", 99],
  ])("%s → %i centavos", (i, c) => expect(parseBRLToCents(i)).toBe(c));
  it.each(["", "abc", "-5", "1,999", "1e9"])("rejeita %s", (i) => expect(parseBRLToCents(i)).toBeNull());
  it("formata", () => expect(formatBRL(15990).replace(/\s/g, " ")).toBe("R$ 159,90"));
});

describe("slug", () => {
  it("remove acentos e símbolos", () => expect(slugify("Chá de Panela da Ana & João!")).toBe("cha-de-panela-da-ana-joao"));
});

describe("validação (zod)", () => {
  it("cadastro não aceita papel admin", () => {
    const r = signUpSchema.safeParse({ full_name: "Ana", email: "a@b.com", password: "12345678", account_type: "admin", accept_terms: "on" });
    expect(r.success).toBe(false);
  });
  it("loja normaliza WhatsApp", () => {
    const r = storeSchema.safeParse({ name: "Loja", city: "Santo Augusto", state: "RS", whatsapp: "(55) 99123-4567" });
    expect(r.success && r.data.whatsapp).toBe("5555991234567");
  });
  it("produto afiliado exige link https", () => {
    const base = { name: "X produto", price: "10,00", availability: "available", status: "draft", affiliate_program_id: "00000000-0000-0000-0000-0000000000a1" };
    expect(affiliateProductSchema.safeParse({ ...base, affiliate_url: "http://x.com" }).success).toBe(false);
    expect(affiliateProductSchema.safeParse({ ...base, affiliate_url: "https://x.com/p" }).success).toBe(true);
  });
  it("reserva exige consentimento e telefone válido", () => {
    const ok = { item_id: "00000000-0000-0000-0000-0000000000a1", guest_name: "Maria", guest_phone: "(55) 99123-4567", consent: "on" };
    expect(reservationSchema.safeParse(ok).success).toBe(true);
    expect(reservationSchema.safeParse({ ...ok, consent: undefined }).success).toBe(false);
    expect(reservationSchema.safeParse({ ...ok, guest_phone: "123" }).success).toBe(false);
  });
});

describe("rate limit", () => {
  it("bloqueia após o máximo na janela", () => {
    const k = "t-" + Math.random();
    expect(rateLimit(k, 2, 1000, 0)).toBe(true);
    expect(rateLimit(k, 2, 1000, 10)).toBe(true);
    expect(rateLimit(k, 2, 1000, 20)).toBe(false);
    expect(rateLimit(k, 2, 1000, 2000)).toBe(true);
  });
});
