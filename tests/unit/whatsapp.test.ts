import { describe, expect, it } from "vitest";
import { buildWhatsappMessage, buildWhatsappUrl, formatWhatsappDisplay, normalizeWhatsapp } from "@/lib/whatsapp";

describe("normalizeWhatsapp", () => {
  it.each([
    ["(55) 99123-4567", "5555991234567"],
    ["55 99123 4567", "5555991234567"],
    ["+55 55 99123-4567", "5555991234567"],
    ["005555991234567", "5555991234567"],
    ["5555991234567", "5555991234567"],
    ["(55) 3781-1234", "555537811234"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeWhatsapp(input)).toBe(expected);
  });

  it.each(["", "123", "(05) 99123-4567", "1 555 123 4567", "55559912345678", null, undefined])("rejeita %s", (input) => {
    expect(normalizeWhatsapp(input as string)).toBeNull();
  });
});

describe("mensagem e URL do WhatsApp", () => {
  it("gera a mensagem exata do ListaLocal", () => {
    expect(buildWhatsappMessage("  Jogo de   toalhas ")).toBe(
      "Olá! Encontrei este produto no ListaLocal e gostaria de saber mais informações: Jogo de toalhas.",
    );
  });

  it("gera wa.me com número normalizado e texto codificado", () => {
    const url = buildWhatsappUrl("(55) 99123-4567", "Cesta & Café #1");
    expect(url).toBe(
      "https://wa.me/5555991234567?text=" +
        encodeURIComponent("Olá! Encontrei este produto no ListaLocal e gostaria de saber mais informações: Cesta & Café #1."),
    );
    const parsed = new URL(url!);
    expect(parsed.hostname).toBe("wa.me");
    expect(parsed.searchParams.get("text")).toContain("Cesta & Café #1");
  });

  it("retorna null para número inválido", () => {
    expect(buildWhatsappUrl("abc", "X")).toBeNull();
  });

  it("formata para exibição", () => {
    expect(formatWhatsappDisplay("5555991234567")).toBe("(55) 99123-4567");
    expect(formatWhatsappDisplay("555537811234")).toBe("(55) 3781-1234");
  });
});
