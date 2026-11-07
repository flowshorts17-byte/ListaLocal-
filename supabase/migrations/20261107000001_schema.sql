-- =====================================================================
-- ListaLocal — Migração 1: estrutura do banco (tabelas, restrições, índices)
-- Banco: Supabase (PostgreSQL 15+). Fuso de exibição: America/Sao_Paulo.
-- Valores monetários são armazenados em CENTAVOS (integer) para evitar
-- erros de arredondamento. Moeda: BRL.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Função genérica para manter updated_at
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. users — perfil público ligado a auth.users
-- ---------------------------------------------------------------------
create table public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text check (full_name is null or char_length(full_name) between 2 and 120),
  phone       text check (phone is null or phone ~ '^[0-9]{10,13}$'),
  role        text not null default 'cliente'
              check (role in ('admin', 'lojista', 'cliente')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index users_role_idx on public.users (role);

-- ---------------------------------------------------------------------
-- 2. categories
-- ---------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 60),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text check (description is null or char_length(description) <= 500),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index categories_active_idx on public.categories (is_active, sort_order);

-- ---------------------------------------------------------------------
-- 3. stores — estabelecimentos locais
-- ---------------------------------------------------------------------
create table public.stores (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid references public.users (id) on delete set null,
  name         text not null check (char_length(name) between 2 and 100),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description  text check (description is null or char_length(description) <= 2000),
  logo_url     text check (logo_url is null or logo_url ~ '^https://'),
  city         text not null check (char_length(city) between 2 and 80),
  state        char(2) not null check (state ~ '^[A-Z]{2}$'),
  address      text check (address is null or char_length(address) <= 200),
  -- WhatsApp comercial: somente dígitos, com DDI 55 + DDD + número
  whatsapp     text not null check (whatsapp ~ '^55[1-9][0-9][0-9]{8,9}$'),
  instagram    text check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  status       text not null default 'pending'
               check (status in ('pending', 'approved', 'rejected', 'suspended')),
  is_demo      boolean not null default false,
  approved_at  timestamptz,
  approved_by  uuid references public.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index stores_owner_idx  on public.stores (owner_id);
create index stores_status_idx on public.stores (status);
create index stores_city_idx   on public.stores (city);

-- ---------------------------------------------------------------------
-- 4. affiliate_programs — marketplaces / programas de afiliados
-- ---------------------------------------------------------------------
create table public.affiliate_programs (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null check (char_length(name) between 2 and 80),
  slug                     text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  marketplace_name         text not null check (char_length(marketplace_name) between 2 and 80),
  website_url              text check (website_url is null or website_url ~ '^https://'),
  terms_url                text check (terms_url is null or terms_url ~ '^https://'),
  -- taxa de comissão ESTIMADA (percentual). Não representa valor aprovado.
  estimated_commission_pct numeric(5,2) check (estimated_commission_pct is null or estimated_commission_pct between 0 and 100),
  notes                    text,
  is_active                boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. products — produtos locais (A) e afiliados (B)
-- ---------------------------------------------------------------------
create table public.products (
  id                    uuid primary key default gen_random_uuid(),
  product_type          text not null check (product_type in ('local', 'affiliate')),
  name                  text not null check (char_length(name) between 2 and 140),
  slug                  text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description           text check (description is null or char_length(description) <= 5000),
  image_url             text check (image_url is null or image_url ~ '^https://'),
  price_cents           integer not null check (price_cents between 0 and 100000000),
  category_id           uuid references public.categories (id) on delete set null,
  store_id              uuid references public.stores (id) on delete cascade,
  affiliate_program_id  uuid references public.affiliate_programs (id) on delete restrict,
  affiliate_url         text check (affiliate_url is null or affiliate_url ~ '^https://'),
  availability          text not null default 'available'
                        check (availability in ('available', 'on_request', 'unavailable')),
  status                text not null default 'draft'
                        check (status in ('draft', 'published', 'archived')),
  is_featured           boolean not null default false,
  is_demo               boolean not null default false,
  created_by            uuid references public.users (id) on delete set null,
  price_updated_at      timestamptz not null default now(),
  published_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- Integridade por tipo:
  constraint products_type_consistency check (
    (product_type = 'local'
       and store_id is not null
       and affiliate_url is null
       and affiliate_program_id is null)
    or
    (product_type = 'affiliate'
       and store_id is null
       and affiliate_url is not null
       and affiliate_program_id is not null)
  )
);
create index products_status_idx      on public.products (status, product_type);
create index products_category_idx    on public.products (category_id);
create index products_store_idx       on public.products (store_id);
create index products_program_idx     on public.products (affiliate_program_id);
create index products_featured_idx    on public.products (is_featured) where is_featured;
create index products_price_idx       on public.products (price_cents);
create index products_name_lower_idx  on public.products (lower(name));

-- ---------------------------------------------------------------------
-- 6. affiliate_clicks — cliques em "COMPRAR NA LOJA"
-- ---------------------------------------------------------------------
create table public.affiliate_clicks (
  id                    bigint generated always as identity primary key,
  product_id            uuid not null references public.products (id) on delete cascade,
  affiliate_program_id  uuid references public.affiliate_programs (id) on delete set null,
  gift_list_id          uuid,
  session_id            text check (session_id is null or char_length(session_id) <= 64),
  referrer              text check (referrer is null or char_length(referrer) <= 500),
  utm_source            text check (utm_source is null or char_length(utm_source) <= 100),
  utm_medium            text check (utm_medium is null or char_length(utm_medium) <= 100),
  utm_campaign          text check (utm_campaign is null or char_length(utm_campaign) <= 100),
  user_id               uuid references public.users (id) on delete set null,
  created_at            timestamptz not null default now()
);
create index affiliate_clicks_product_idx on public.affiliate_clicks (product_id, created_at desc);
create index affiliate_clicks_program_idx on public.affiliate_clicks (affiliate_program_id, created_at desc);
create index affiliate_clicks_created_idx on public.affiliate_clicks (created_at desc);

-- ---------------------------------------------------------------------
-- 6b. events — métricas gerais (visitas, visualizações, cliques WhatsApp)
-- ---------------------------------------------------------------------
create table public.events (
  id            bigint generated always as identity primary key,
  event_type    text not null check (event_type in (
                  'page_view', 'product_view', 'store_view', 'list_view',
                  'whatsapp_click', 'affiliate_click')),
  product_id    uuid references public.products (id) on delete cascade,
  store_id      uuid references public.stores (id) on delete cascade,
  gift_list_id  uuid,
  product_type  text check (product_type is null or product_type in ('local', 'affiliate')),
  session_id    text check (session_id is null or char_length(session_id) <= 64),
  referrer      text check (referrer is null or char_length(referrer) <= 500),
  path          text check (path is null or char_length(path) <= 300),
  user_id       uuid references public.users (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index events_type_created_idx on public.events (event_type, created_at desc);
create index events_product_idx      on public.events (product_id, event_type);
create index events_store_idx        on public.events (store_id, event_type, created_at desc);

-- ---------------------------------------------------------------------
-- 7. gift_lists — listas de presentes
-- ---------------------------------------------------------------------
create table public.gift_lists (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.users (id) on delete cascade,
  title        text not null check (char_length(title) between 3 and 120),
  event_type   text not null check (event_type in (
                 'cha_de_bebe', 'cha_de_panela', 'casamento',
                 'aniversario', 'casa_nova', 'outros')),
  event_date   date,
  description  text check (description is null or char_length(description) <= 1000),
  city         text check (city is null or char_length(city) <= 80),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  is_public    boolean not null default true,
  status       text not null default 'active' check (status in ('active', 'closed', 'archived')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index gift_lists_owner_idx on public.gift_lists (owner_id);

alter table public.affiliate_clicks
  add constraint affiliate_clicks_gift_list_fk
  foreign key (gift_list_id) references public.gift_lists (id) on delete set null;
alter table public.events
  add constraint events_gift_list_fk
  foreign key (gift_list_id) references public.gift_lists (id) on delete set null;

-- ---------------------------------------------------------------------
-- 8. gift_list_items
-- ---------------------------------------------------------------------
create table public.gift_list_items (
  id                uuid primary key default gen_random_uuid(),
  gift_list_id      uuid not null references public.gift_lists (id) on delete cascade,
  product_id        uuid not null references public.products (id) on delete restrict,
  quantity_desired  integer not null default 1 check (quantity_desired between 1 and 50),
  note              text check (note is null or char_length(note) <= 300),
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint gift_list_items_unique_product unique (gift_list_id, product_id)
);
create index gift_list_items_product_idx on public.gift_list_items (product_id);

-- ---------------------------------------------------------------------
-- 9. reservations — reservas temporárias de itens LOCAIS de listas
-- ---------------------------------------------------------------------
create table public.reservations (
  id                 uuid primary key default gen_random_uuid(),
  -- restrict: um item com reservas não pode ser apagado (preserva o histórico)
  gift_list_item_id  uuid not null references public.gift_list_items (id) on delete restrict,
  product_id         uuid not null references public.products (id) on delete cascade,
  store_id           uuid not null references public.stores (id) on delete cascade,
  quantity           integer not null default 1 check (quantity between 1 and 10),
  guest_name         text not null check (char_length(guest_name) between 2 and 80),
  guest_phone        text not null check (guest_phone ~ '^[0-9]{10,13}$'),
  guest_message      text check (guest_message is null or char_length(guest_message) <= 300),
  status             text not null default 'pending'
                     check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'expired')),
  expires_at         timestamptz not null,
  confirmed_at       timestamptz,
  confirmed_by       uuid references public.users (id) on delete set null,
  completed_at       timestamptz,
  cancelled_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint reservations_expiry_after_creation check (expires_at > created_at)
);
create index reservations_item_status_idx on public.reservations (gift_list_item_id, status);
create index reservations_store_idx       on public.reservations (store_id, status, created_at desc);
create index reservations_phone_idx       on public.reservations (guest_phone, created_at desc);

-- ---------------------------------------------------------------------
-- 10. purchases — vendas INFORMADAS (pelo convidado) e VERIFICADAS
--     (confirmadas pela loja ou pelo administrador).
-- ---------------------------------------------------------------------
create table public.purchases (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid references public.products (id) on delete set null,
  product_type        text not null check (product_type in ('local', 'affiliate')),
  store_id            uuid references public.stores (id) on delete set null,
  affiliate_program_id uuid references public.affiliate_programs (id) on delete set null,
  gift_list_item_id   uuid references public.gift_list_items (id) on delete set null,
  reservation_id      uuid unique references public.reservations (id) on delete set null,
  source              text not null check (source in (
                        'guest_reported', 'store_confirmed', 'admin_confirmed', 'affiliate_report')),
  verification_status text not null default 'reported'
                      check (verification_status in ('reported', 'verified', 'rejected')),
  quantity            integer not null default 1 check (quantity between 1 and 100),
  amount_cents        integer check (amount_cents is null or amount_cents >= 0),
  buyer_name          text check (buyer_name is null or char_length(buyer_name) <= 80),
  notes               text check (notes is null or char_length(notes) <= 500),
  reported_at         timestamptz not null default now(),
  verified_at         timestamptz,
  verified_by         uuid references public.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- Somente fontes "confirmadas" podem nascer verificadas
  constraint purchases_verified_source check (
    verification_status <> 'verified'
    or source in ('store_confirmed', 'admin_confirmed', 'affiliate_report')
  )
);
create index purchases_item_idx    on public.purchases (gift_list_item_id);
create index purchases_store_idx   on public.purchases (store_id, created_at desc);
create index purchases_status_idx  on public.purchases (verification_status, source);

-- ---------------------------------------------------------------------
-- 11. commissions — comissões ESTIMADAS x APROVADAS
-- ---------------------------------------------------------------------
create table public.commissions (
  id                   uuid primary key default gen_random_uuid(),
  purchase_id          uuid references public.purchases (id) on delete set null,
  affiliate_program_id uuid references public.affiliate_programs (id) on delete set null,
  store_id             uuid references public.stores (id) on delete set null,
  amount_cents         integer not null check (amount_cents >= 0),
  status               text not null default 'estimated'
                       check (status in ('estimated', 'approved', 'rejected', 'paid')),
  reference_month      date,
  external_reference   text check (external_reference is null or char_length(external_reference) <= 120),
  notes                text check (notes is null or char_length(notes) <= 500),
  approved_at          timestamptz,
  created_by           uuid references public.users (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index commissions_status_idx on public.commissions (status, reference_month);

-- ---------------------------------------------------------------------
-- 12. subscriptions — plano do lojista (sem cobrança automática no MVP)
-- ---------------------------------------------------------------------
create table public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  store_id            uuid not null references public.stores (id) on delete cascade,
  plan                text not null default 'gratuito' check (plan in ('gratuito', 'basico', 'destaque')),
  status              text not null default 'active' check (status in ('trial', 'active', 'past_due', 'cancelled')),
  price_cents         integer not null default 0 check (price_cents >= 0),
  started_at          timestamptz not null default now(),
  current_period_end  timestamptz,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index subscriptions_store_idx on public.subscriptions (store_id, status);

-- ---------------------------------------------------------------------
-- 13. banners — banner principal da Home
-- ---------------------------------------------------------------------
create table public.banners (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 2 and 120),
  subtitle    text check (subtitle is null or char_length(subtitle) <= 240),
  image_url   text check (image_url is null or image_url ~ '^https://'),
  link_url    text check (link_url is null or link_url ~ '^(/|https://)'),
  cta_label   text check (cta_label is null or char_length(cta_label) <= 40),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint banners_period check (ends_at is null or starts_at is null or ends_at > starts_at)
);

-- ---------------------------------------------------------------------
-- Gatilhos de updated_at
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'users','categories','stores','affiliate_programs','products','gift_lists',
    'gift_list_items','reservations','purchases','commissions','subscriptions','banners'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t);
  end loop;
end $$;
