# ListaLocal — MVP

**Encontre. Escolha. Presenteie.**

Marketplace híbrido de produtos e presentes: lojas locais (contato pelo WhatsApp), ofertas de marketplaces por links de afiliados e listas de presentes com reservas. Primeira operação: Santo Augusto/RS. Idioma pt-BR, moeda BRL, fuso America/Sao_Paulo.

> O ListaLocal **não processa pagamentos** e **não simula vendas**. Cliques são registrados como intenção; vendas só contam como verificadas quando a loja ou o administrador confirmam.

---

## 1. Stack

| Camada | Tecnologia |
|---|---|
| Front-end | Next.js 16.4 (App Router, Server Components, Server Actions), React 19.3, TypeScript 5 |
| Estilo | Tailwind CSS 4, fontes Inter e Fraunces (auto-hospedadas via @fontsource) |
| Back-end | Server Actions + Route Handlers do Next.js |
| Banco | Supabase PostgreSQL (RLS em todas as tabelas, funções SQL para regras críticas) |
| Autenticação | Supabase Auth (e-mail e senha) via `@supabase/ssr` |
| Arquivos | Supabase Storage (bucket `product-images`) |
| Validação | zod 4 (no servidor) + restrições/gatilhos no banco |
| Testes | Vitest + PGlite (PostgreSQL 18 em WASM) |
| Hospedagem | Vercel · versionamento GitHub |

> No Next.js 16 o antigo `middleware.ts` passou a se chamar **`proxy.ts`** (`src/proxy.ts`). A função é a mesma.

## 2. Estrutura de pastas

```
listalocal/
├─ supabase/
│  ├─ migrations/
│  │  ├─ 20261107000001_schema.sql      # tabelas, FKs, índices, CHECKs, updated_at
│  │  ├─ 20261107000002_functions.sql   # papéis, gatilhos de proteção, reservas, cliques, métricas
│  │  ├─ 20261107000003_rls.sql         # GRANTs + políticas RLS de todas as tabelas
│  │  └─ 20261107000004_storage.sql     # bucket de imagens + políticas do Storage
│  ├─ setup-completo.sql                # as 4 migrações juntas (para o SQL Editor)
│  └─ seed.sql                          # categorias + dados de DEMONSTRAÇÃO
├─ src/
│  ├─ proxy.ts                          # renova sessão e protege /painel, /admin, /minhas-listas
│  ├─ app/
│  │  ├─ page.tsx                       # Home
│  │  ├─ catalogo/ · categoria/[slug]/  # catálogo com filtros
│  │  ├─ produto/[slug]/                # detalhes + JSON-LD Product
│  │  ├─ lojas/ · lojas/[slug]/         # diretório e página pública da loja
│  │  ├─ minhas-listas/ · [id]/         # criar e gerenciar listas (autenticado)
│  │  ├─ lista/[slug]/                  # página pública da lista (reservar / "já comprei")
│  │  ├─ w/[productId]/route.ts         # COMPRAR PELO WHATSAPP (registra e redireciona)
│  │  ├─ r/[productId]/route.ts         # COMPRAR NA LOJA (registra e redireciona p/ afiliado)
│  │  ├─ painel/                        # painel do lojista
│  │  ├─ admin/                         # painel administrativo
│  │  ├─ (auth)/entrar · cadastro       # login e cadastro
│  │  ├─ auth/callback/                 # confirmação de e-mail
│  │  ├─ api/cron/expirar-reservas/     # rotina opcional (Vercel Cron)
│  │  ├─ privacidade · termos · cookies · divulgacao-de-afiliados
│  │  └─ sitemap.ts · robots.ts
│  ├─ components/                       # cabeçalho, rodapé, cards, formulários…
│  └─ lib/                              # supabase, auth, dados, validação, WhatsApp, formatação
├─ tests/
│  ├─ sql/supabase-stub.sql             # stub mínimo de auth/storage (só para testes)
│  ├─ sql/database.test.ts              # migrações + RLS + funções (PGlite)
│  └─ unit/*.test.ts                    # WhatsApp, redirecionamento, preços, validação
├─ .env.example · vercel.json · package.json
```

## 3. Banco de dados

Tabelas (todas com RLS): `users` (perfil ligado a `auth.users`, papel `admin|lojista|cliente`), `stores`, `products` (`product_type local|affiliate`, `status draft|published|archived`), `categories`, `affiliate_programs`, `affiliate_clicks`, `events` (visualizações e cliques no WhatsApp), `gift_lists`, `gift_list_items`, `reservations`, `purchases` (vendas informadas × verificadas), `commissions` (estimadas × aprovadas), `subscriptions`, `banners`.

Regras importantes garantidas **no banco** (não só na interface):

- Cadastro nunca gera admin: o gatilho `handle_new_user` só aceita `cliente` ou `lojista`. Usuário não altera o próprio papel.
- Loja nasce `pending`; só o admin aprova. Lojista só publica produto com loja aprovada, não destaca produtos e não cria produto afiliado.
- Produto `local` exige loja e não aceita link; produto `affiliate` exige programa e link `https://`.
- Preços em centavos (`integer`). O valor da venda concluída é calculado no banco a partir do preço salvo — nunca vem do navegador.
- Destino dos botões de compra vem do banco (`register_product_click`), nunca de parâmetro da URL.
- **Reservas** (`reserve_gift_item`): trava a linha do item com `SELECT … FOR UPDATE`, expira reservas vencidas, soma reservas ativas + vendas e recusa se ultrapassar a quantidade desejada. Validade de 48 h, limite de 5 reservas por telefone/hora.
- "Já comprei" em item afiliado (`report_affiliate_purchase`) gera venda **informada**, nunca verificada, e **não bloqueia** o item.
- Item com reservas não pode ser apagado (preserva histórico).
- Imagens: bucket público para leitura, envio só por lojista/admin, na pasta `<id-do-usuário>/`, extensões jpg/jpeg/png/webp, limite 5 MB (também validado no servidor pela assinatura real do arquivo).

## 4. Configurar o Supabase (passo a passo)

1. Crie uma conta em <https://supabase.com> → **New project** (região sugerida: São Paulo, `sa-east-1`). Guarde a senha do banco.
2. **Rodar as migrações** — escolha uma opção:
   - **SQL Editor (mais simples):** abra *SQL Editor → New query*, cole o conteúdo de `supabase/setup-completo.sql` e clique em **Run**. Depois, opcionalmente, rode `supabase/seed.sql`.
   - **Supabase CLI:**
     ```bash
     npm i -g supabase          # ou: npx supabase …
     supabase login
     supabase init              # cria supabase/config.toml (mantenha a pasta migrations existente)
     supabase link --project-ref SEU_PROJECT_REF
     supabase db push           # aplica supabase/migrations/*
     # dados de demonstração (opcional):
     psql "$(supabase db url)" -f supabase/seed.sql   # ou cole o seed no SQL Editor
     ```
   > Se o SQL Editor recusar as políticas de `storage.objects` (permissão), crie-as em *Storage → Policies* com as mesmas regras do arquivo `20261107000004_storage.sql`.
3. **Storage:** a migração 4 já cria o bucket `product-images` (público, 5 MB, JPEG/PNG/WEBP). Confira em *Storage → Buckets*.
4. **Auth:** em *Authentication → URL Configuration* defina **Site URL** (ex.: `https://listalocal.vercel.app`) e adicione em **Redirect URLs**: `https://SEU-DOMINIO/auth/callback` e `http://localhost:3000/auth/callback`. Mantenha "Confirm email" ligado. (Opcional: traduza os modelos de e-mail para português em *Authentication → Email Templates*.)
5. **Chaves:** em *Project Settings → API* copie `Project URL`, `anon public` e `service_role` para o `.env.local` (seção 6).
6. **Primeiro administrador:** cadastre-se normalmente pelo site (`/cadastro`), confirme o e-mail e rode no SQL Editor:
   ```sql
   update public.users set role = 'admin' where email = 'seu-email@exemplo.com';
   ```
7. **Remover a demonstração** quando for lançar:
   ```sql
   delete from public.products where is_demo;
   delete from public.stores   where is_demo;
   ```

## 5. Instalação local

Requisitos: Node.js 20.9+ (testado com Node 22) e npm.

```bash
npm install
cp .env.example .env.local     # preencha as chaves do Supabase
npm run dev                    # http://localhost:3000
```

Scripts:

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` / `npm start` | build de produção / servir build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sem emitir arquivos |
| `npm test` | todos os testes (unitários + banco em PGlite) |
| `npm run sql:bundle` | regenera `supabase/setup-completo.sql` |

O projeto compila e abre **sem** as variáveis do Supabase (mostra um aviso "Banco de dados não configurado" e as áreas privadas redirecionam para o login).

## 6. Variáveis de ambiente (`.env.example`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-publica
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role   # só no servidor; nunca com prefixo NEXT_PUBLIC_
NEXT_PUBLIC_SITE_URL=http://localhost:3000          # em produção: https://seu-dominio
CRON_SECRET=                                        # opcional, protege /api/cron/expirar-reservas
```

A chave `service_role` só é usada na rota de cron (`src/lib/supabase/admin.ts`, marcado `server-only`). Todo o resto usa a chave anon + sessão do usuário, com RLS.

## 7. Publicar na Vercel (via GitHub)

1. Crie um repositório no GitHub e envie o projeto:
   ```bash
   git init && git add . && git commit -m "ListaLocal MVP"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/listalocal.git
   git push -u origin main
   ```
2. Em <https://vercel.com> → **Add New → Project** → importe o repositório (framework detectado: Next.js).
3. Em **Environment Variables**, cadastre as 4 variáveis da seção 6 (+ `CRON_SECRET`, se quiser a rotina diária). Use em `NEXT_PUBLIC_SITE_URL` o domínio final.
4. **Deploy.** Depois, volte ao Supabase (passo 4 da seção 4) e cadastre o domínio da Vercel em Site URL/Redirect URLs.
5. O `vercel.json` agenda `/api/cron/expirar-reservas` uma vez por dia (a Vercel envia `Authorization: Bearer CRON_SECRET`). Ele é opcional: reservas vencidas já são ignoradas automaticamente nas consultas.

## 8. Funcionalidades concluídas (implementadas no código)

- **Home** com título/subtítulo pedidos, busca, banner (gerenciável), botões "Descobrir produtos"/"Criar minha lista", categorias, destaques, lojas participantes, sugestões até R$ 200, populares (calculado por visualizações e cliques reais de 30 dias) e rodapé institucional.
- **Catálogo** com busca, filtros (categoria, cidade, tipo), ordenação por preço, paginação e etiquetas *Loja local*, *Oferta afiliada*, *Destaque* (e *Demonstração*). Página indexável por categoria (sem indexar categoria vazia).
- **Produto**: imagem, nome, descrição, preço com data de atualização, loja/marketplace, categoria, disponibilidade, botão de compra, "adicionar à lista", JSON-LD `Product`.
- **COMPRAR PELO WHATSAPP** (`/w/[id]`): registra o clique e abre `wa.me/<número da loja>` com a mensagem "Olá! Encontrei este produto no ListaLocal e gostaria de saber mais informações: [nome]." Lojas de demonstração não abrem WhatsApp real.
- **COMPRAR NA LOJA** (`/r/[id]`): registra clique em `affiliate_clicks` (programa, lista de origem, sessão/origem/UTM só com consentimento) e redireciona para o link salvo; links `rel="sponsored nofollow"`. Robôs/pré-visualizações não contam como clique.
- **Lojas**: diretório por cidade e página pública (logo, descrição, cidade, categorias, WhatsApp, produtos, JSON-LD `Store`).
- **Listas de presentes**: criar (chá de bebê, chá de panela, casamento, aniversário, casa nova, outros), data, mensagem, adicionar produtos do catálogo, quantidade, link público `/lista/[slug]` + compartilhar no WhatsApp, acompanhamento (reservas e compras informadas), encerrar lista.
- **Reservas locais** temporárias (48 h) com confirmação da loja e conclusão da venda; **"Já comprei"** para itens afiliados com aviso de que não é verificado.
- **Painel do lojista**: cadastro/edição da loja (com logo), produtos (criar, editar, preço, imagem, disponibilidade, publicação), reservas (confirmar, concluir venda, cancelar), cliques/visualizações por produto, indicadores.
- **Painel administrativo**: dashboard que separa cliques × intenções × vendas informadas × verificadas × comissões estimadas × aprovadas (7/30/90/365 dias); usuários (papel e ativação); lojas (aprovar, recusar, suspender, cadastrar); produtos locais e afiliados (criar, editar, ativar/desativar, destacar); categorias; programas de afiliados; banners; cliques; reservas; registrar vendas confirmadas e verificar/rejeitar vendas informadas; comissões; listas.
- **Segurança**: RLS em todas as tabelas, gatilhos de proteção, validação zod em todas as Server Actions, proxy + checagem de papel nos layouts, campo-isca + tempo mínimo + limite por IP no cadastro, limite por IP e por telefone nas reservas, uploads validados por assinatura, cabeçalhos de segurança.
- **LGPD**: banner de cookies (essenciais × métricas), identificador de sessão só com consentimento, consentimento explícito para dados de reserva, páginas de privacidade, termos, cookies e divulgação de afiliados.
- **SEO**: metadados por página, `sitemap.xml` (produtos, lojas e categorias com produtos; sem demonstração), `robots.txt`, URLs amigáveis, `next/image` para imagens do Supabase, listas pessoais e áreas privadas com `noindex`.

## 9. Pendências / limitações conhecidas

- **Não testado contra um projeto Supabase real** (não havia credenciais no ambiente). As consultas do app (PostgREST/supabase-js), login, confirmação de e-mail e upload no Storage precisam ser validados após criar o projeto.
- Testes de banco rodam em PGlite com um **stub** de `auth`/`storage`; o PGlite tem uma única conexão, então a **concorrência real** de reservas não foi exercitada (a proteção usa `SELECT … FOR UPDATE`, padrão do PostgreSQL).
- Interface **não foi verificada visualmente** em navegador neste ambiente (sem navegador disponível); só por build, lint e requisições HTTP.
- Sem recuperação de senha ("esqueci minha senha") e sem edição de perfil do usuário.
- Sem notificações (e-mail/WhatsApp) para loja/organizador quando há reserva — o acompanhamento é pelo painel.
- Limite por IP é em memória (por instância serverless); as regras críticas também estão no banco.
- `subscriptions` existe no banco (planos sem cobrança), mas ainda não há tela para gerenciar planos.
- Sem importação automática de relatórios de afiliados (comissões são lançadas manualmente pelo admin).
- Textos legais são modelos — revisar com advogado antes do lançamento.

## 10. Resultados dos testes (executados em 07/11/2026, Node 22.23)

| Verificação | Resultado |
|---|---|
| `npm run lint` (ESLint) | ✅ sem erros/avisos |
| `npm run typecheck` (tsc) | ✅ sem erros |
| `npm run build` (sem variáveis do Supabase) | ✅ build concluído (todas as rotas dinâmicas, exceto robots/sitemap) + proxy |
| `npm test` | ✅ **86 testes aprovados** (4 arquivos) |
| ↳ `tests/sql/database.test.ts` | 42 testes: migrações + seed, papéis, RLS de lojas/produtos/listas/reservas/vendas/comissões/eventos, proteção de preço, cliques (WhatsApp, afiliado, demo, não publicado), reservas (sobreposição, expiração, limite por telefone, permissões, conclusão gera venda verificada com preço do banco), "já comprei" não bloqueia, métricas, Storage |
| ↳ `tests/unit/*` | 44 testes: normalização e URL do WhatsApp, mensagem exata, decisão de redirecionamento (tipo errado, demo, URL insegura), detecção de robôs, preços BRL, slug, zod, rate limit |
| Smoke test HTTP (`next start` sem Supabase) | ✅ páginas públicas 200; produto inexistente 404; `/painel`, `/admin`, `/minhas-listas` → 307 para `/entrar`; `/r` e `/w` com id inválido → 302 para `/catalogo`; cron sem segredo → 401 |
