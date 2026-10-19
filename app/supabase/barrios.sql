-- =============================================================================
-- El Tradicional · barrios que no se borran.
--
-- Ejecutar UNA VEZ en Supabase → SQL Editor (pegar todo y "Run"). Se puede repetir sin problema.
--
-- Qué hace:
--   1. Crea una tabla solo para los barrios. Cada barrio es un registro aparte: agregarlo,
--      cambiarle el precio o quitarlo no depende de ningún otro ajuste, así que ningún celular
--      (aunque tenga una versión vieja de la app) puede volver a borrarlo.
--   2. La llena con los barrios que tiene hoy el panel y recupera los que se perdieron y tienen
--      pedidos (con el último nombre y precio cobrado).
-- =============================================================================

-- ----------------------------------------------------------------- barrios --
-- Each barrio is its own row: adding one, changing its price or removing it touches only that row,
-- so no phone saving other settings (even with an old copy or an old version) can undo it.
do $$
declare first_time boolean := to_regclass('public.zones') is null;
begin
  create table if not exists public.zones (
    id         text primary key check (char_length(id) between 1 and 60),
    label      text not null check (char_length(trim(label)) between 1 and 60),
    fee        integer not null default 0 check (fee between 0 and 1000000),
    ord        bigint generated always as identity,
    created_at timestamptz not null default now()
  );
  if first_time then
    -- 1. the list the panel had until now (kept inside the settings)
    insert into public.zones (id, label, fee)
    select z->>'id', left(trim(z->>'label'), 60), least(1000000, greatest(0, coalesce((z->>'fee')::numeric, 0)))::int
    from public.settings s,
         jsonb_array_elements(case when jsonb_typeof(s.desc_overrides->'__app'->'zones') = 'array'
                                   then s.desc_overrides->'__app'->'zones' else '[]'::jsonb end) with ordinality as e(z, i)
    where s.id = 1 and coalesce(z->>'id', '') <> '' and coalesce(trim(z->>'label'), '') <> ''
    order by i
    on conflict (id) do nothing;
    -- 2. never set up: the original list
    if not exists (select 1 from public.zones) then
      insert into public.zones (id, label, fee) values
      ('magnolia', 'La Magnolia', 0),
      ('alto_flores', 'Alto de las Flores', 8000),
      ('cumbres', 'Cumbres', 6000),
      ('milan', 'Milán', 5000),
      ('cometas', 'Las Cometas', 4000),
      ('rosellon', 'Rosellón', 6000),
      ('castelli', 'Castelli', 7000),
      ('obrero', 'El Obrero', 3000),
      ('naranjos', 'Los Naranjos', 2000),
      ('city_plaza', 'City Plaza', 7000),
      ('primavera', 'Primavera', 5000),
      ('san_rafael', 'San Rafael', 7000),
      ('cuenca', 'Cuenca', 8000),
      ('montiel', 'Jardines de Montiel', 6000),
      ('mina', 'La Mina', 7000),
      ('quintas_serrania', 'Quintas de la Serranía', 5000),
      ('quintas_zuniga', 'Quintas de Zúñiga', 4000),
      ('bosques_zuniga', 'Bosques de Zúñiga', 5000),
      ('barrio_mesa', 'Barrio Mesa', 5000),
      ('alcala', 'Alcalá', 6000),
      ('viva', 'Viva Envigado', 6000),
      ('terrazas', 'Terrazas del Río', 5000),
      ('california', 'California', 6000),
      ('mesa', 'Mesa', 5000),
      ('portal', 'El Portal', 5000),
      ('san_mateo', 'San Mateo', 2000),
      ('camino_verde', 'Camino Verde', 5000),
      ('viviendas_sur', 'Viviendas del Sur', 10000);
    end if;
    -- 3. barrios that orders were placed from but had been lost from the list (last name and price)
    insert into public.zones (id, label, fee)
    select id, label, fee from (
      select distinct on (lower(label)) id, label, fee, at from (
        select distinct on (o.zone_id) o.zone_id as id, left(trim(o.zone_label), 60) as label,
               least(1000000, greatest(0, o.delivery)) as fee, o.created_at as at
        from public.orders o
        where o.origin = 'domicilio' and o.zone_id is not null and o.zone_id <> 'otro' and coalesce(trim(o.zone_label), '') <> ''
        order by o.zone_id, o.created_at desc
      ) by_id
      order by lower(label), at desc
    ) used
    where not exists (select 1 from public.zones z where z.id = used.id or lower(z.label) = lower(used.label))
    order by at
    on conflict (id) do nothing;
  end if;
end $$;

alter table public.zones enable row level security;
drop policy if exists zones_read on public.zones;
create policy zones_read on public.zones for select to anon, authenticated using (true);
drop policy if exists zones_owner_write on public.zones;
create policy zones_owner_write on public.zones for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));
grant select on public.zones to anon, authenticated;
grant insert, update, delete on public.zones to authenticated;
revoke insert, update, delete, truncate on public.zones from anon;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'zones') then
    alter publication supabase_realtime add table public.zones;
  end if;
end $$;

notify pgrst, 'reload schema';
