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
