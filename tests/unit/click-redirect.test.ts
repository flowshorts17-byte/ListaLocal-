import { describe, expect, it } from "vitest";
import { decideClickRedirect, isLikelyBot, isSafeExternalUrl, isUuid, type ClickRow } from "@/lib/click-redirect";

const local: ClickRow = {
  product_type: "local", product_name: "Vaso de cerâmica", product_slug: "vaso-de-ceramica",
  whatsapp: "5555991234567", affiliate_url: null, is_demo: false,
};
const aff: ClickRow = {
  product_type: "affiliate", product_name: "Liquidificador", product_slug: "liquidificador",
  whatsapp: null, affiliate_url: "https://www.amazon.com.br/dp/X?tag=abc-20", is_demo: false,
};

describe("decideClickRedirect", () => {
  it("local → wa.me com a mensagem", () => {
    const d = decideClickRedirect(local, "whatsapp");
    expect(d.type).toBe("external");
    if (d.type === "external") {
      expect(d.url.startsWith("https://wa.me/5555991234567?text=")).toBe(true);
      expect(decodeURIComponent(d.url.split("text=")[1]!)).toBe(
        "Olá! Encontrei este produto no ListaLocal e gostaria de saber mais informações: Vaso de cerâmica.",
      );
    }
  });

  it("afiliado → exatamente o link salvo no banco", () => {
    expect(decideClickRedirect(aff, "affiliate")).toEqual({ type: "external", url: aff.affiliate_url });
  });

  it("produto inexistente → catálogo", () => {
    expect(decideClickRedirect(null, "affiliate")).toEqual({ type: "internal", path: "/catalogo", reason: "not_found" });
  });

  it("tipo trocado (rota de afiliado para produto local) → página do produto", () => {
    expect(decideClickRedirect(local, "affiliate")).toMatchObject({ type: "internal", path: "/produto/vaso-de-ceramica", reason: "wrong_type" });
    expect(decideClickRedirect(aff, "whatsapp")).toMatchObject({ type: "internal", reason: "wrong_type" });
  });

  it("demonstração nunca sai do site", () => {
    expect(decideClickRedirect({ ...local, is_demo: true, whatsapp: null }, "whatsapp")).toMatchObject({
      type: "internal", path: "/produto/vaso-de-ceramica?demo=1", reason: "demo",
    });
  });

  it("link de afiliado inseguro não é seguido", () => {
    for (const bad of ["http://amazon.com.br/x", "javascript:alert(1)", "https://user:pass@evil.com", "https://localhost/x", "", null]) {
      expect(decideClickRedirect({ ...aff, affiliate_url: bad }, "affiliate")).toMatchObject({ type: "internal", reason: "invalid_target" });
    }
  });

  it("WhatsApp inválido não gera redirecionamento", () => {
    expect(decideClickRedirect({ ...local, whatsapp: "123" }, "whatsapp")).toMatchObject({ type: "internal", reason: "invalid_target" });
  });
});

describe("auxiliares", () => {
  it("isSafeExternalUrl", () => {
    expect(isSafeExternalUrl("https://www.mercadolivre.com.br/p/MLB1")).toBe(true);
    expect(isSafeExternalUrl("ftp://x.com")).toBe(false);
  });
  it("isLikelyBot", () => {
    expect(isLikelyBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isLikelyBot("WhatsApp/2.23")).toBe(true);
    expect(isLikelyBot(null)).toBe(true);
    expect(isLikelyBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1")).toBe(false);
  });
  it("isUuid", () => {
    expect(isUuid("00000000-0000-0000-0000-0000000000a1")).toBe(true);
    expect(isUuid("1; drop table")).toBe(false);
  });
});
