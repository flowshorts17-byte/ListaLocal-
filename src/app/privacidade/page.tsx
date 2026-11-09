import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Política de privacidade", alternates: { canonical: "/privacidade" } };

export default function Page() {
  return (
    <LegalPage title="Política de privacidade" updated="07/11/2026">
      <p>Esta política explica como o Mimoa trata dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).</p>
      <h2>Dados que coletamos</h2>
      <ul>
        <li><strong>Conta:</strong> nome, e-mail e senha (armazenada de forma criptografada pelo provedor de autenticação).</li>
        <li><strong>Lojas:</strong> nome do estabelecimento, cidade, endereço opcional e WhatsApp comercial, exibidos publicamente.</li>
        <li><strong>Listas de presentes:</strong> nome e data do evento e itens escolhidos pelo organizador.</li>
        <li><strong>Reservas:</strong> nome, telefone e mensagem do convidado, compartilhados apenas com a loja do produto reservado e com o organizador da lista.</li>
        <li><strong>Métricas:</strong> visualizações e cliques em botões de compra. Identificador anônimo de sessão e página de origem só são registrados se você aceitar os cookies de métricas.</li>
      </ul>
      <h2>Finalidades e bases legais</h2>
      <ul>
        <li>Execução do serviço (contas, listas, reservas) — execução de contrato.</li>
        <li>Segurança e prevenção de abuso — legítimo interesse.</li>
        <li>Métricas de uso com identificador de sessão — consentimento, que pode ser revogado a qualquer momento apagando os cookies.</li>
      </ul>
      <h2>Compartilhamento</h2>
      <p>Não vendemos dados pessoais. Ao clicar em “Comprar pelo WhatsApp” você inicia uma conversa diretamente com a loja. Ao clicar em “Comprar na loja” você é levado ao site de um marketplace, que tem sua própria política de privacidade. Usamos provedores de infraestrutura (Supabase e Vercel) para hospedar o serviço.</p>
      <h2>Retenção</h2>
      <p>Dados de conta são mantidos enquanto a conta existir. Reservas e registros de vendas são mantidos pelo tempo necessário para o histórico da lista e para obrigações legais.</p>
      <h2>Seus direitos</h2>
      <p>Você pode solicitar acesso, correção, portabilidade ou exclusão dos seus dados, e revogar consentimentos, pelo canal de contato indicado pelo Mimoa.</p>
    </LegalPage>
  );
}
