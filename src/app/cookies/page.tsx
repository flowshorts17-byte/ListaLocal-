import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Política de cookies", alternates: { canonical: "/cookies" } };

export default function Page() {
  return (
    <LegalPage title="Política de cookies" updated="07/11/2026">
      <h2>Cookies essenciais (sempre ativos)</h2>
      <ul>
        <li><strong>Sessão de login</strong> (cookies <code>sb-*</code> do Supabase): mantêm você conectado com segurança.</li>
        <li><strong>ll_consent</strong>: guarda sua escolha sobre cookies.</li>
      </ul>
      <h2>Cookies de métricas (opcionais)</h2>
      <ul>
        <li><strong>ll_sid</strong>: identificador aleatório e anônimo usado para contar visitantes únicos e relacionar visualizações e cliques. Só é criado se você clicar em “Aceitar métricas”.</li>
      </ul>
      <p>Sem o consentimento, contamos visualizações e cliques de forma agregada, sem identificador de sessão e sem página de origem.</p>
      <h2>Como mudar sua escolha</h2>
      <p>Apague os cookies do site no seu navegador; o aviso aparecerá novamente.</p>
      <p>Não usamos cookies de publicidade de terceiros. Ao sair para um marketplace, os cookies daquele site seguem a política dele.</p>
    </LegalPage>
  );
}
