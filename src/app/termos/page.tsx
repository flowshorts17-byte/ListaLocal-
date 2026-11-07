import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Termos de uso", alternates: { canonical: "/termos" } };

export default function Page() {
  return (
    <LegalPage title="Termos de uso" updated="07/11/2026">
      <h2>O que é o ListaLocal</h2>
      <p>O ListaLocal é uma plataforma de descoberta de produtos e de listas de presentes. Reunimos produtos de lojas locais parceiras e ofertas de marketplaces por meio de programas de afiliados.</p>
      <h2>Compras</h2>
      <ul>
        <li>O ListaLocal <strong>não vende produtos e não processa pagamentos</strong>.</li>
        <li>Produtos de lojas locais são negociados diretamente com a loja, pelo WhatsApp. Preço, disponibilidade, pagamento, entrega e trocas são de responsabilidade da loja.</li>
        <li>Ofertas afiliadas são compradas no site do marketplace, sob os termos dele. Preços exibidos aqui podem estar desatualizados.</li>
      </ul>
      <h2>Listas e reservas</h2>
      <ul>
        <li>Reservas de itens locais são temporárias (48 horas) e dependem da confirmação da loja.</li>
        <li>A marcação “Já comprei” de itens afiliados é declarada pelo convidado e não é verificada pela plataforma.</li>
      </ul>
      <h2>Lojistas</h2>
      <p>Lojas passam por aprovação. O lojista é responsável pela veracidade das informações, pelos direitos de uso das imagens enviadas e pelo atendimento aos clientes, conforme o Código de Defesa do Consumidor.</p>
      <h2>Uso adequado</h2>
      <p>É proibido usar a plataforma para fraude, envio de conteúdo ilícito, cadastros automatizados ou reservas abusivas. Contas podem ser suspensas em caso de violação.</p>
    </LegalPage>
  );
}
