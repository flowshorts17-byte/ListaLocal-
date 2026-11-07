-- ListaLocal — setup completo (gerado por scripts/bundle-sql.mjs). Execute UMA vez num projeto novo.

-- >>> 20261107000001_schema.sql
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


-- >>> 20261107000002_functions.sql
-- =====================================================================
-- ListaLocal — Migração 2: funções auxiliares, gatilhos de proteção e RPCs
-- =====================================================================

-- ---------------------------------------------------------------------
-- Funções de papel (role). SECURITY DEFINER para evitar recursão de RLS.
-- ---------------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.role from public.users u where u.id = auth.uid() and u.is_active
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

create or replace function public.is_lojista()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_user_role() = 'lojista', false)
$$;

create or replace function public.owns_store(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.stores s
    where s.id = p_store_id and s.owner_id = auth.uid() and auth.uid() is not null
  )
$$;

create or replace function public.owns_gift_list(p_list_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.gift_lists g
    where g.id = p_list_id and g.owner_id = auth.uid() and auth.uid() is not null
  )
$$;

-- "Privilegiado" = chamada que não vem dos papéis públicos da API
-- (service_role, postgres, funções SECURITY DEFINER) ou um admin.
create or replace function public.is_privileged()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select current_user not in ('anon', 'authenticated') or public.is_admin()
$$;

-- ---------------------------------------------------------------------
-- Criação automática do perfil quando um usuário se cadastra no Auth.
-- O papel 'admin' NUNCA é aceito a partir dos metadados do cadastro.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text := 'cliente';
  v_name text;
begin
  if coalesce(new.raw_user_meta_data ->> 'account_type', '') = 'lojista' then
    v_role := 'lojista';
  end if;
  v_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  if v_name is not null and char_length(v_name) > 120 then
    v_name := left(v_name, 120);
  end if;
  if v_name is not null and char_length(v_name) < 2 then
    v_name := null;
  end if;
  insert into public.users (id, email, full_name, role)
  values (new.id, new.email, v_name, v_role)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Proteções de escrita (executam ANTES das alterações)
-- ---------------------------------------------------------------------

-- users: usuário comum não altera o próprio papel nem o status
create or replace function public.guard_users_write()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if public.is_privileged() then
    return new;
  end if;
  if new.role is distinct from old.role or new.is_active is distinct from old.is_active
     or new.id is distinct from old.id then
    raise exception 'Somente administradores podem alterar papel ou status de usuários.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger users_guard before update on public.users
  for each row execute function public.guard_users_write();

-- stores: lojista cria loja própria (sempre pendente) e não aprova a si mesmo
create or replace function public.guard_stores_write()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if public.is_privileged() then
    if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
      new.approved_at := coalesce(new.approved_at, now());
      new.approved_by := coalesce(new.approved_by, auth.uid());
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    if not public.is_lojista() then
      raise exception 'Apenas contas de lojista podem cadastrar lojas.' using errcode = '42501';
    end if;
    if new.owner_id is distinct from auth.uid() then
      raise exception 'A loja deve pertencer ao usuário autenticado.' using errcode = '42501';
    end if;
    if new.status <> 'pending' or new.is_demo or new.approved_at is not null or new.approved_by is not null then
      raise exception 'Novas lojas começam com status pendente.' using errcode = '42501';
    end if;
    return new;
  end if;

  -- UPDATE por lojista
  if new.owner_id is distinct from old.owner_id
     or new.status is distinct from old.status
     or new.is_demo is distinct from old.is_demo
     or new.approved_at is distinct from old.approved_at
     or new.approved_by is distinct from old.approved_by then
    raise exception 'Somente administradores podem alterar status, aprovação ou responsável da loja.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger stores_guard before insert or update on public.stores
  for each row execute function public.guard_stores_write();

-- products: lojista só mexe em produto LOCAL da própria loja; não destaca;
-- só publica se a loja estiver aprovada. Datas de preço/publicação automáticas.
create or replace function public.guard_products_write()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_store_status text;
begin
  -- Datas automáticas (para todos)
  if tg_op = 'INSERT' then
    new.price_updated_at := now();
  elsif new.price_cents is distinct from old.price_cents then
    new.price_updated_at := now();
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := now();
  end if;

  if public.is_privileged() then
    return new;
  end if;

  if not public.is_lojista() then
    raise exception 'Sem permissão para gerenciar produtos.' using errcode = '42501';
  end if;
  if new.product_type <> 'local' then
    raise exception 'Lojistas só podem cadastrar produtos locais.' using errcode = '42501';
  end if;
  if not public.owns_store(new.store_id) then
    raise exception 'Produto deve pertencer a uma loja sua.' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.is_featured or new.is_demo then
      raise exception 'Somente administradores podem destacar produtos.' using errcode = '42501';
    end if;
    new.created_by := auth.uid();
  else
    if new.store_id is distinct from old.store_id
       or new.product_type is distinct from old.product_type
       or new.is_featured is distinct from old.is_featured
       or new.is_demo is distinct from old.is_demo
       or new.created_by is distinct from old.created_by then
      raise exception 'Alteração não permitida para lojistas.' using errcode = '42501';
    end if;
  end if;

  if new.status = 'published' then
    select s.status into v_store_status from public.stores s where s.id = new.store_id;
    if v_store_status is distinct from 'approved' then
      raise exception 'A loja precisa ser aprovada antes de publicar produtos.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger products_guard before insert or update on public.products
  for each row execute function public.guard_products_write();

-- gift_lists: dono não pode ser trocado por usuário comum
create or replace function public.guard_gift_lists_write()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if public.is_privileged() then
    return new;
  end if;
  if tg_op = 'INSERT' and new.owner_id is distinct from auth.uid() then
    raise exception 'A lista deve pertencer ao usuário autenticado.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.owner_id is distinct from old.owner_id then
    raise exception 'Não é possível transferir a lista.' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger gift_lists_guard before insert or update on public.gift_lists
  for each row execute function public.guard_gift_lists_write();

-- Apenas produtos publicados podem entrar em listas
create or replace function public.guard_gift_list_items_write()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if public.is_privileged() then
    return new;
  end if;
  if not exists (select 1 from public.products p where p.id = new.product_id and p.status = 'published') then
    raise exception 'Somente produtos publicados podem ser adicionados à lista.' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and (new.gift_list_id is distinct from old.gift_list_id
                           or new.product_id is distinct from old.product_id) then
    raise exception 'Alteração não permitida.' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger gift_list_items_guard before insert or update on public.gift_list_items
  for each row execute function public.guard_gift_list_items_write();

-- ---------------------------------------------------------------------
-- Reservas
-- ---------------------------------------------------------------------

-- Marca como expiradas as reservas pendentes vencidas (pode rodar via cron)
create or replace function public.expire_reservations()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_count integer;
begin
  update public.reservations
     set status = 'expired'
   where status = 'pending' and expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Quantidade já comprometida de um item (reservas ativas + vendas não rejeitadas
-- sem reserva). Reservas pendentes vencidas NÃO contam.
create or replace function public.gift_item_committed_qty(p_item_id uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce((select sum(r.quantity) from public.reservations r
              where r.gift_list_item_id = p_item_id
                and (r.status in ('confirmed', 'completed')
                     or (r.status = 'pending' and r.expires_at > now()))), 0)::int
  + coalesce((select sum(pu.quantity) from public.purchases pu
              where pu.gift_list_item_id = p_item_id
                and pu.reservation_id is null
                and pu.product_type = 'local'
                and pu.verification_status <> 'rejected'), 0)::int
$$;

-- Reserva temporária de item LOCAL. Seguro contra concorrência:
-- a linha do item é travada (FOR UPDATE) durante toda a verificação.
create or replace function public.reserve_gift_item(
  p_item_id      uuid,
  p_guest_name   text,
  p_guest_phone  text,
  p_message      text default null,
  p_quantity     integer default 1
)
returns table (reservation_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item       record;
  v_name       text := btrim(coalesce(p_guest_name, ''));
  v_phone      text := regexp_replace(coalesce(p_guest_phone, ''), '\D', '', 'g');
  v_msg        text := nullif(btrim(coalesce(p_message, '')), '');
  v_committed  integer;
  v_recent     integer;
  v_id         uuid;
  v_expires    timestamptz := now() + interval '48 hours';
begin
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'Informe seu nome (2 a 80 caracteres).' using errcode = 'P0001';
  end if;
  if v_phone !~ '^[0-9]{10,13}$' then
    raise exception 'Informe um telefone válido com DDD.' using errcode = 'P0001';
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 10 then
    raise exception 'Quantidade inválida.' using errcode = 'P0001';
  end if;
  if v_msg is not null and char_length(v_msg) > 300 then
    v_msg := left(v_msg, 300);
  end if;

  -- trava a linha do item: reservas simultâneas do mesmo item ficam em fila
  select i.id, i.quantity_desired, p.id as product_id, p.product_type, p.status as product_status,
         p.availability, p.store_id, s.status as store_status, g.status as list_status, g.is_public
    into v_item
    from public.gift_list_items i
    join public.gift_lists g on g.id = i.gift_list_id
    join public.products p on p.id = i.product_id
    left join public.stores s on s.id = p.store_id
   where i.id = p_item_id
     for update of i;

  if not found or not v_item.is_public or v_item.list_status <> 'active' then
    raise exception 'Item de lista não encontrado ou lista indisponível.' using errcode = 'P0001';
  end if;
  if v_item.product_type <> 'local' then
    raise exception 'Reservas só estão disponíveis para produtos de lojas locais.' using errcode = 'P0001';
  end if;
  if v_item.product_status <> 'published' or v_item.store_status is distinct from 'approved'
     or v_item.availability = 'unavailable' then
    raise exception 'Este produto não está disponível para reserva no momento.' using errcode = 'P0001';
  end if;

  -- proteção contra abuso: no máximo 5 reservas por telefone por hora
  select count(*) into v_recent from public.reservations r
   where r.guest_phone = v_phone and r.created_at > now() - interval '1 hour';
  if v_recent >= 5 then
    raise exception 'Muitas reservas em pouco tempo. Tente novamente mais tarde.' using errcode = 'P0001';
  end if;

  -- libera reservas vencidas deste item
  update public.reservations r
     set status = 'expired'
   where r.gift_list_item_id = p_item_id and r.status = 'pending' and r.expires_at <= now();

  v_committed := public.gift_item_committed_qty(p_item_id);
  if v_committed + p_quantity > v_item.quantity_desired then
    raise exception 'Este presente já foi reservado por outro convidado.' using errcode = 'P0001';
  end if;

  insert into public.reservations
    (gift_list_item_id, product_id, store_id, quantity, guest_name, guest_phone, guest_message, expires_at)
  values
    (p_item_id, v_item.product_id, v_item.store_id, p_quantity, v_name, v_phone, v_msg, v_expires)
  returning id into v_id;

  return query select v_id, v_expires;
end;
$$;

-- Loja (ou admin) confirma, conclui ou cancela uma reserva.
-- Ao concluir, registra uma VENDA VERIFICADA (fonte: loja ou admin).
create or replace function public.set_reservation_status(p_reservation_id uuid, p_status text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_res     record;
  v_admin   boolean := public.is_admin();
  v_price   integer;
begin
  if p_status not in ('confirmed', 'completed', 'cancelled') then
    raise exception 'Status inválido.' using errcode = 'P0001';
  end if;

  select * into v_res from public.reservations where id = p_reservation_id for update;
  if not found then
    raise exception 'Reserva não encontrada.' using errcode = 'P0001';
  end if;
  if not (v_admin or public.owns_store(v_res.store_id)) then
    raise exception 'Sem permissão para alterar esta reserva.' using errcode = '42501';
  end if;

  if v_res.status = 'pending' and v_res.expires_at <= now() then
    update public.reservations set status = 'expired' where id = p_reservation_id;
    raise exception 'Esta reserva expirou.' using errcode = 'P0001';
  end if;

  if not (
       (v_res.status = 'pending'   and p_status in ('confirmed', 'cancelled'))
    or (v_res.status = 'confirmed' and p_status in ('completed', 'cancelled'))
  ) then
    raise exception 'Transição de status não permitida (% → %).', v_res.status, p_status
      using errcode = 'P0001';
  end if;

  update public.reservations
     set status       = p_status,
         confirmed_at = case when p_status = 'confirmed' then now() else confirmed_at end,
         confirmed_by = case when p_status = 'confirmed' then auth.uid() else confirmed_by end,
         completed_at = case when p_status = 'completed' then now() else completed_at end,
         cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end
   where id = p_reservation_id;

  if p_status = 'completed' then
    select price_cents into v_price from public.products where id = v_res.product_id;
    insert into public.purchases
      (product_id, product_type, store_id, gift_list_item_id, reservation_id, source,
       verification_status, quantity, amount_cents, buyer_name, verified_at, verified_by)
    values
      (v_res.product_id, 'local', v_res.store_id, v_res.gift_list_item_id, v_res.id,
       case when public.owns_store(v_res.store_id) then 'store_confirmed' else 'admin_confirmed' end,
       'verified', v_res.quantity, v_price * v_res.quantity, v_res.guest_name, now(), auth.uid())
    on conflict (reservation_id) do nothing;
  end if;

  return p_status;
end;
$$;

-- Convidado informa que comprou um item AFILIADO.
-- Fica como "venda informada" (não verificada). Não bloqueia o item.
create or replace function public.report_affiliate_purchase(
  p_item_id    uuid,
  p_guest_name text,
  p_message    text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item   record;
  v_name   text := btrim(coalesce(p_guest_name, ''));
  v_recent integer;
  v_id     uuid;
begin
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'Informe seu nome (2 a 80 caracteres).' using errcode = 'P0001';
  end if;

  select i.id, p.id as product_id, p.product_type, p.affiliate_program_id, g.status as list_status, g.is_public
    into v_item
    from public.gift_list_items i
    join public.gift_lists g on g.id = i.gift_list_id
    join public.products p on p.id = i.product_id
   where i.id = p_item_id;

  if not found or not v_item.is_public or v_item.list_status <> 'active' then
    raise exception 'Item de lista não encontrado ou lista indisponível.' using errcode = 'P0001';
  end if;
  if v_item.product_type <> 'affiliate' then
    raise exception 'Para produtos de lojas locais, use a reserva.' using errcode = 'P0001';
  end if;

  select count(*) into v_recent from public.purchases pu
   where pu.gift_list_item_id = p_item_id and pu.source = 'guest_reported'
     and pu.created_at > now() - interval '10 minutes';
  if v_recent >= 3 then
    raise exception 'Muitas marcações recentes neste item. Tente novamente mais tarde.' using errcode = 'P0001';
  end if;

  insert into public.purchases
    (product_id, product_type, affiliate_program_id, gift_list_item_id, source,
     verification_status, buyer_name, notes)
  values
    (v_item.product_id, 'affiliate', v_item.affiliate_program_id, p_item_id, 'guest_reported',
     'reported', v_name, nullif(left(btrim(coalesce(p_message, '')), 500), ''))
  returning id into v_id;
  return v_id;
end;
$$;

-- Situação pública dos itens de uma lista (sem dados pessoais dos convidados)
create or replace function public.gift_list_item_status(p_list_id uuid)
returns table (
  item_id          uuid,
  quantity_desired integer,
  reserved_qty     integer,
  purchased_qty    integer,
  reported_qty     integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    i.id,
    i.quantity_desired,
    coalesce((select sum(r.quantity) from public.reservations r
              where r.gift_list_item_id = i.id
                and (r.status = 'confirmed' or (r.status = 'pending' and r.expires_at > now()))), 0)::int,
    coalesce((select sum(pu.quantity) from public.purchases pu
              where pu.gift_list_item_id = i.id and pu.verification_status = 'verified'), 0)::int,
    coalesce((select sum(pu.quantity) from public.purchases pu
              where pu.gift_list_item_id = i.id and pu.verification_status = 'reported'), 0)::int
  from public.gift_list_items i
  join public.gift_lists g on g.id = i.gift_list_id
  where i.gift_list_id = p_list_id
    and ((g.is_public and g.status <> 'archived') or g.owner_id = auth.uid() or public.is_admin())
$$;

-- ---------------------------------------------------------------------
-- Rastreamento
-- ---------------------------------------------------------------------

-- Registra visualizações (page/product/store/list). Dados mínimos (LGPD).
create or replace function public.log_event(
  p_event_type   text,
  p_product_id   uuid default null,
  p_store_id     uuid default null,
  p_gift_list_id uuid default null,
  p_session_id   text default null,
  p_referrer     text default null,
  p_path         text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_type text;
  v_store uuid := p_store_id;
begin
  if p_event_type not in ('page_view', 'product_view', 'store_view', 'list_view') then
    raise exception 'Tipo de evento inválido.' using errcode = 'P0001';
  end if;
  if p_product_id is not null then
    select p.product_type, coalesce(p.store_id, v_store) into v_type, v_store
      from public.products p where p.id = p_product_id and p.status = 'published';
    if not found then
      return;
    end if;
  end if;
  insert into public.events (event_type, product_id, store_id, gift_list_id, product_type,
                             session_id, referrer, path, user_id)
  values (p_event_type, p_product_id, v_store, p_gift_list_id, v_type,
          left(p_session_id, 64), left(p_referrer, 500), left(p_path, 300), auth.uid());
end;
$$;

-- Registra o clique em COMPRAR e devolve o destino OFICIAL vindo do banco.
-- O destino nunca é aceito do navegador.
create or replace function public.register_product_click(
  p_product_id   uuid,
  p_gift_list_id uuid default null,
  p_session_id   text default null,
  p_referrer     text default null,
  p_utm_source   text default null,
  p_utm_medium   text default null,
  p_utm_campaign text default null
)
returns table (
  product_type  text,
  product_name  text,
  product_slug  text,
  whatsapp      text,
  affiliate_url text,
  is_demo       boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v record;
  v_list uuid := null;
begin
  select p.id, p.product_type, p.name, p.slug, p.affiliate_url, p.affiliate_program_id,
         p.store_id, s.whatsapp, s.status as store_status, (p.is_demo or coalesce(s.is_demo, false)) as is_demo
    into v
    from public.products p
    left join public.stores s on s.id = p.store_id
   where p.id = p_product_id and p.status = 'published';

  if not found then
    return;
  end if;
  if v.product_type = 'local' and v.store_status is distinct from 'approved' then
    return;
  end if;

  if p_gift_list_id is not null
     and exists (select 1 from public.gift_lists g where g.id = p_gift_list_id) then
    v_list := p_gift_list_id;
  end if;

  if v.product_type = 'affiliate' then
    insert into public.affiliate_clicks
      (product_id, affiliate_program_id, gift_list_id, session_id, referrer,
       utm_source, utm_medium, utm_campaign, user_id)
    values
      (v.id, v.affiliate_program_id, v_list, left(p_session_id, 64), left(p_referrer, 500),
       left(p_utm_source, 100), left(p_utm_medium, 100), left(p_utm_campaign, 100), auth.uid());
    insert into public.events (event_type, product_id, gift_list_id, product_type, session_id, referrer, user_id)
    values ('affiliate_click', v.id, v_list, 'affiliate', left(p_session_id, 64), left(p_referrer, 500), auth.uid());
  else
    insert into public.events (event_type, product_id, store_id, gift_list_id, product_type, session_id, referrer, user_id)
    values ('whatsapp_click', v.id, v.store_id, v_list, 'local', left(p_session_id, 64), left(p_referrer, 500), auth.uid());
  end if;

  return query select v.product_type, v.name, v.slug,
    -- lojas/produtos de DEMONSTRAÇÃO nunca abrem um WhatsApp real
    case when v.product_type = 'local' and not v.is_demo then v.whatsapp else null end,
    case when v.product_type = 'affiliate' and not v.is_demo then v.affiliate_url else null end,
    v.is_demo;
end;
$$;

-- ---------------------------------------------------------------------
-- Indicadores
-- ---------------------------------------------------------------------
create or replace function public.admin_metrics(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 3650)));
begin
  if not public.is_admin() then
    raise exception 'Acesso restrito ao administrador.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'since', v_since,
    'visitors', (select count(distinct session_id) from events where created_at >= v_since and session_id is not null),
    'page_views', (select count(*) from events where created_at >= v_since and event_type = 'page_view'),
    'product_views', (select count(*) from events where created_at >= v_since and event_type = 'product_view'),
    'whatsapp_clicks', (select count(*) from events where created_at >= v_since and event_type = 'whatsapp_click'),
    'affiliate_clicks', (select count(*) from affiliate_clicks where created_at >= v_since),
    'purchase_intents', (select count(*) from reservations where created_at >= v_since),
    'reported_sales', (select count(*) from purchases where created_at >= v_since and verification_status = 'reported'),
    'verified_sales', (select count(*) from purchases where created_at >= v_since and verification_status = 'verified'),
    'verified_sales_cents', (select coalesce(sum(amount_cents), 0) from purchases where created_at >= v_since and verification_status = 'verified'),
    'commissions_estimated_cents', (select coalesce(sum(amount_cents), 0) from commissions where created_at >= v_since and status = 'estimated'),
    'commissions_approved_cents', (select coalesce(sum(amount_cents), 0) from commissions where created_at >= v_since and status in ('approved', 'paid')),
    'stores_pending', (select count(*) from stores where status = 'pending'),
    'products_published', (select count(*) from products where status = 'published'),
    'gift_lists', (select count(*) from gift_lists)
  );
end;
$$;

create or replace function public.store_metrics(p_store_id uuid, p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 3650)));
begin
  if not (public.is_admin() or public.owns_store(p_store_id)) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'since', v_since,
    'product_views', (select count(*) from events where store_id = p_store_id and event_type = 'product_view' and created_at >= v_since),
    'whatsapp_clicks', (select count(*) from events where store_id = p_store_id and event_type = 'whatsapp_click' and created_at >= v_since),
    'reservations_pending', (select count(*) from reservations where store_id = p_store_id and status = 'pending' and expires_at > now()),
    'reservations_total', (select count(*) from reservations where store_id = p_store_id and created_at >= v_since),
    'verified_sales', (select count(*) from purchases where store_id = p_store_id and verification_status = 'verified' and created_at >= v_since)
  );
end;
$$;

-- Produtos populares (por cliques e visualizações nos últimos 30 dias).
-- Devolve apenas ids de produtos publicados e uma pontuação agregada.
create or replace function public.popular_product_ids(p_limit integer default 8)
returns table (product_id uuid, score bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.product_id,
         sum(case when e.event_type in ('whatsapp_click', 'affiliate_click') then 3 else 1 end)::bigint as score
    from public.events e
    join public.products p on p.id = e.product_id and p.status = 'published'
   where e.created_at > now() - interval '30 days'
     and e.event_type in ('product_view', 'whatsapp_click', 'affiliate_click')
   group by e.product_id
   order by score desc
   limit least(greatest(coalesce(p_limit, 8), 1), 50)
$$;


-- >>> 20261107000003_rls.sql
-- =====================================================================
-- ListaLocal — Migração 3: permissões (GRANT) e políticas RLS
-- Regra geral: RLS ligado em TODAS as tabelas; nada é público por padrão.
-- =====================================================================

-- Tabelas
alter table public.users              enable row level security;
alter table public.categories         enable row level security;
alter table public.stores             enable row level security;
alter table public.affiliate_programs enable row level security;
alter table public.products           enable row level security;
alter table public.affiliate_clicks   enable row level security;
alter table public.events             enable row level security;
alter table public.gift_lists         enable row level security;
alter table public.gift_list_items    enable row level security;
alter table public.reservations       enable row level security;
alter table public.purchases          enable row level security;
alter table public.commissions        enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.banners            enable row level security;

-- ---------------------------------------------------------------------
-- GRANTs explícitos (as políticas RLS restringem as linhas)
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;

grant select on public.categories, public.stores, public.affiliate_programs, public.products,
                public.gift_lists, public.gift_list_items, public.banners
  to anon, authenticated;

grant select, update on public.users to authenticated;
grant insert, update, delete on public.categories, public.affiliate_programs, public.banners to authenticated;
grant insert, update, delete on public.stores, public.products to authenticated;
grant insert, update, delete on public.gift_lists, public.gift_list_items to authenticated;
grant select on public.affiliate_clicks, public.events to authenticated;
grant select, update on public.reservations to authenticated;
grant select, insert, update, delete on public.purchases, public.commissions, public.subscriptions to authenticated;
grant delete on public.users to authenticated;

grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------
-- Funções: ninguém executa por padrão; liberamos apenas as RPCs públicas
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.current_user_role()        to anon, authenticated;
grant execute on function public.is_admin()                 to anon, authenticated;
grant execute on function public.is_lojista()               to anon, authenticated;
grant execute on function public.owns_store(uuid)           to anon, authenticated;
grant execute on function public.owns_gift_list(uuid)       to anon, authenticated;
grant execute on function public.is_privileged()            to anon, authenticated;
grant execute on function public.set_updated_at()           to anon, authenticated;
grant execute on function public.guard_users_write()        to anon, authenticated;
grant execute on function public.guard_stores_write()       to anon, authenticated;
grant execute on function public.guard_products_write()     to anon, authenticated;
grant execute on function public.guard_gift_lists_write()   to anon, authenticated;
grant execute on function public.guard_gift_list_items_write() to anon, authenticated;

grant execute on function public.reserve_gift_item(uuid, text, text, text, integer)       to anon, authenticated;
grant execute on function public.report_affiliate_purchase(uuid, text, text)              to anon, authenticated;
grant execute on function public.gift_list_item_status(uuid)                              to anon, authenticated;
grant execute on function public.log_event(text, uuid, uuid, uuid, text, text, text)      to anon, authenticated;
grant execute on function public.register_product_click(uuid, uuid, text, text, text, text, text) to anon, authenticated;
grant execute on function public.popular_product_ids(integer)                              to anon, authenticated;
grant execute on function public.set_reservation_status(uuid, text)                       to authenticated;
grant execute on function public.admin_metrics(integer)                                   to authenticated;
grant execute on function public.store_metrics(uuid, integer)                             to authenticated;
grant execute on function public.expire_reservations()                                    to service_role;
grant execute on all functions in schema public to service_role;

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
create policy users_select_self_or_admin on public.users
  for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy users_update_self on public.users
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
create policy users_delete_admin on public.users
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
create policy categories_select_public on public.categories
  for select to anon, authenticated
  using (is_active or public.is_admin());
create policy categories_admin_write on public.categories
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- stores
-- ---------------------------------------------------------------------
create policy stores_select_public on public.stores
  for select to anon, authenticated
  using (status = 'approved' or owner_id = auth.uid() or public.is_admin());
create policy stores_insert_lojista on public.stores
  for insert to authenticated
  with check ((owner_id = auth.uid() and public.is_lojista()) or public.is_admin());
create policy stores_update_owner on public.stores
  for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy stores_delete_admin on public.stores
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- affiliate_programs
-- ---------------------------------------------------------------------
create policy affiliate_programs_select on public.affiliate_programs
  for select to anon, authenticated
  using (is_active or public.is_admin());
create policy affiliate_programs_admin_write on public.affiliate_programs
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------
create policy products_select_public on public.products
  for select to anon, authenticated
  using (
    (status = 'published' and (
        product_type = 'affiliate'
        or exists (select 1 from public.stores s where s.id = store_id and s.status = 'approved')))
    or public.owns_store(store_id)
    or public.is_admin()
  );
create policy products_insert on public.products
  for insert to authenticated
  with check (public.is_admin() or (product_type = 'local' and public.owns_store(store_id)));
create policy products_update on public.products
  for update to authenticated
  using (public.is_admin() or public.owns_store(store_id))
  with check (public.is_admin() or (product_type = 'local' and public.owns_store(store_id)));
create policy products_delete on public.products
  for delete to authenticated
  using (public.is_admin() or public.owns_store(store_id));

-- ---------------------------------------------------------------------
-- affiliate_clicks / events — gravação apenas via funções; leitura restrita
-- ---------------------------------------------------------------------
create policy affiliate_clicks_select_admin on public.affiliate_clicks
  for select to authenticated
  using (public.is_admin());
create policy events_select on public.events
  for select to authenticated
  using (public.is_admin() or (store_id is not null and public.owns_store(store_id)));

-- ---------------------------------------------------------------------
-- gift_lists / gift_list_items
-- ---------------------------------------------------------------------
create policy gift_lists_select on public.gift_lists
  for select to anon, authenticated
  using ((is_public and status <> 'archived') or owner_id = auth.uid() or public.is_admin());
create policy gift_lists_insert on public.gift_lists
  for insert to authenticated
  with check (owner_id = auth.uid());
create policy gift_lists_update on public.gift_lists
  for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy gift_lists_delete on public.gift_lists
  for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

create policy gift_list_items_select on public.gift_list_items
  for select to anon, authenticated
  using (exists (
    select 1 from public.gift_lists g
    where g.id = gift_list_id
      and ((g.is_public and g.status <> 'archived') or g.owner_id = auth.uid() or public.is_admin())));
create policy gift_list_items_insert on public.gift_list_items
  for insert to authenticated
  with check (public.owns_gift_list(gift_list_id) or public.is_admin());
create policy gift_list_items_update on public.gift_list_items
  for update to authenticated
  using (public.owns_gift_list(gift_list_id) or public.is_admin())
  with check (public.owns_gift_list(gift_list_id) or public.is_admin());
create policy gift_list_items_delete on public.gift_list_items
  for delete to authenticated
  using (public.owns_gift_list(gift_list_id) or public.is_admin());

-- ---------------------------------------------------------------------
-- reservations — criação apenas via reserve_gift_item();
-- alteração de status via set_reservation_status() (ou admin)
-- ---------------------------------------------------------------------
create policy reservations_select on public.reservations
  for select to authenticated
  using (
    public.is_admin()
    or public.owns_store(store_id)
    or exists (select 1 from public.gift_list_items i
               join public.gift_lists g on g.id = i.gift_list_id
               where i.id = gift_list_item_id and g.owner_id = auth.uid())
  );
create policy reservations_update_admin on public.reservations
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- purchases — informadas via report_affiliate_purchase(); verificadas
-- pela loja (set_reservation_status) ou registradas pelo admin
-- ---------------------------------------------------------------------
create policy purchases_select on public.purchases
  for select to authenticated
  using (
    public.is_admin()
    or (store_id is not null and public.owns_store(store_id))
    or exists (select 1 from public.gift_list_items i
               join public.gift_lists g on g.id = i.gift_list_id
               where i.id = gift_list_item_id and g.owner_id = auth.uid())
  );
create policy purchases_admin_write on public.purchases
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- commissions — somente admin
-- ---------------------------------------------------------------------
create policy commissions_admin on public.commissions
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- subscriptions — lojista lê a própria; admin gerencia
-- ---------------------------------------------------------------------
create policy subscriptions_select on public.subscriptions
  for select to authenticated
  using (public.is_admin() or public.owns_store(store_id));
create policy subscriptions_admin_write on public.subscriptions
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- banners
-- ---------------------------------------------------------------------
create policy banners_select_public on public.banners
  for select to anon, authenticated
  using ((is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()))
         or public.is_admin());
create policy banners_admin_write on public.banners
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- >>> 20261107000004_storage.sql
-- =====================================================================
-- ListaLocal — Migração 4: Supabase Storage (imagens de produtos/lojas)
-- Bucket público para leitura; envio somente por lojistas/admins, em pasta
-- com o próprio id de usuário: product-images/<auth.uid()>/<arquivo>.
-- Limite: 5 MB; tipos: JPEG, PNG, WEBP (validado também no servidor).
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "product_images_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'product-images');

create policy "product_images_insert_own_folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (public.is_lojista() or public.is_admin())
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

create policy "product_images_update_own_folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

create policy "product_images_delete_own_or_admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
