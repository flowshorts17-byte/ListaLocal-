-- =====================================================================
-- ListaLocal — DADOS DE DEMONSTRAÇÃO
-- ---------------------------------------------------------------------
-- ATENÇÃO: tudo marcado com is_demo = true e com "[DEMONSTRAÇÃO]" no nome
-- é FICTÍCIO e serve apenas para visualizar o layout. Não há vendas,
-- reservas, cliques ou comissões falsas neste arquivo.
-- Lojas de demonstração NÃO abrem WhatsApp real (o número é bloqueado
-- pela função register_product_click).
-- NÃO há produtos afiliados de demonstração: links de afiliado só podem
-- ser cadastrados pelo administrador, com links reais dos programas.
-- Para remover a demonstração:
--   delete from public.products where is_demo;
--   delete from public.stores   where is_demo;
-- =====================================================================

-- Categorias (dados reais de configuração, podem ser mantidos)
insert into public.categories (name, slug, description, sort_order) values
  ('Casa e cozinha',      'casa-e-cozinha',      'Utensílios, decoração e itens para o lar.', 1),
  ('Bebê e infantil',     'bebe-e-infantil',     'Enxoval, brinquedos e cuidados para os pequenos.', 2),
  ('Moda e acessórios',   'moda-e-acessorios',   'Roupas, calçados, bolsas e acessórios.', 3),
  ('Beleza e bem-estar',  'beleza-e-bem-estar',  'Perfumaria, cuidados pessoais e bem-estar.', 4),
  ('Flores e presentes',  'flores-e-presentes',  'Flores, cestas e lembranças.', 5),
  ('Eletrônicos',         'eletronicos',         'Eletrônicos e eletroportáteis.', 6),
  ('Papelaria e livros',  'papelaria-e-livros',  'Livros, papelaria e artigos criativos.', 7)
on conflict (slug) do nothing;

-- Programas de afiliados: apenas o CADASTRO do marketplace (sem links).
-- Ative e preencha a comissão estimada somente após aprovação no programa.
insert into public.affiliate_programs (name, slug, marketplace_name, website_url, is_active, notes) values
  ('Amazon Associados', 'amazon-associados', 'Amazon', 'https://www.amazon.com.br', false,
   'Preencher após aprovação no programa. Não usar links sem ID de afiliado aprovado.'),
  ('Mercado Livre Afiliados', 'mercado-livre-afiliados', 'Mercado Livre', 'https://www.mercadolivre.com.br', false,
   'Preencher após aprovação no programa.'),
  ('Magalu Parceiro', 'magalu-parceiro', 'Magalu', 'https://www.magazineluiza.com.br', false,
   'Preencher após aprovação no programa.')
on conflict (slug) do nothing;

-- Lojas de DEMONSTRAÇÃO (sem dono; aprovadas para aparecerem no site)
insert into public.stores (name, slug, description, city, state, whatsapp, status, is_demo, approved_at) values
  ('[DEMONSTRAÇÃO] Ateliê Exemplo', 'demo-atelie-exemplo',
   'Loja fictícia criada apenas para demonstrar o layout do ListaLocal.',
   'Santo Augusto', 'RS', '5555999990001', 'approved', true, now()),
  ('[DEMONSTRAÇÃO] Casa Exemplo Utilidades', 'demo-casa-exemplo-utilidades',
   'Loja fictícia criada apenas para demonstrar o layout do ListaLocal.',
   'Santo Augusto', 'RS', '5555999990002', 'approved', true, now())
on conflict (slug) do nothing;

-- Produtos LOCAIS de DEMONSTRAÇÃO
insert into public.products (product_type, name, slug, description, price_cents, category_id, store_id,
                             availability, status, is_featured, is_demo)
select 'local', v.name, v.slug, v.description, v.price_cents,
       (select id from public.categories where slug = v.category),
       (select id from public.stores where slug = v.store),
       'available', 'published', v.featured, true
from (values
  ('[DEMONSTRAÇÃO] Jogo de toalhas bordadas', 'demo-jogo-de-toalhas-bordadas',
   'Produto fictício para demonstração.', 15990, 'casa-e-cozinha', 'demo-casa-exemplo-utilidades', true),
  ('[DEMONSTRAÇÃO] Conjunto de potes de vidro', 'demo-conjunto-de-potes-de-vidro',
   'Produto fictício para demonstração.', 8990, 'casa-e-cozinha', 'demo-casa-exemplo-utilidades', false),
  ('[DEMONSTRAÇÃO] Manta de algodão para bebê', 'demo-manta-de-algodao-para-bebe',
   'Produto fictício para demonstração.', 12900, 'bebe-e-infantil', 'demo-atelie-exemplo', true),
  ('[DEMONSTRAÇÃO] Cesta de café da manhã', 'demo-cesta-de-cafe-da-manha',
   'Produto fictício para demonstração.', 18990, 'flores-e-presentes', 'demo-atelie-exemplo', false)
) as v(name, slug, description, price_cents, category, store, featured)
on conflict (slug) do nothing;

-- Banner principal (texto institucional, sem dados fictícios)
insert into public.banners (title, subtitle, link_url, cta_label, sort_order)
select 'Comércio de Santo Augusto em um só lugar',
       'Lojas locais e grandes marketplaces lado a lado, para você escolher com calma.',
       '/catalogo', 'Ver catálogo', 1
where not exists (select 1 from public.banners);
