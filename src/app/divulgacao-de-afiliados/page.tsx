import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Divulgação de links de afiliados", alternates: { canonical: "/divulgacao-de-afiliados" } };

export default function Page() {
  return (
    <LegalPage title="Divulgação de links de afiliados" updated="07/11/2026">
      <p>Alguns produtos do ListaLocal são <strong>ofertas afiliadas</strong>, identificadas com a etiqueta “Oferta afiliada” e o botão “Comprar na loja”.</p>
      <ul>
        <li>Quando você compra por esses links, o ListaLocal pode receber uma comissão do marketplace. <strong>Você não paga nada a mais por isso.</strong></li>
        <li>Os links são gerados nos programas oficiais de afiliados e cadastrados manualmente pela equipe. Não criamos links falsos nem alteramos preços.</li>
        <li>Preços e disponibilidade são definidos pelo marketplace e podem mudar; confira sempre no site antes de comprar.</li>
        <li>Registramos o clique para medir interesse. Um clique não é tratado como venda; comissões só são consideradas aprovadas após confirmação do programa.</li>
        <li>Produtos de lojas locais (etiqueta “Loja local”) não são links de afiliado: o contato é feito diretamente com a loja pelo WhatsApp.</li>
      </ul>
    </LegalPage>
  );
}
