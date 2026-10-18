-- =============================================================================
-- El Tradicional · precio completo, sin descuentos ni promociones.
--
-- Ejecutar UNA VEZ en Supabase → SQL Editor (pegar todo y "Run"). Se puede repetir sin problema.
--
-- Qué hace:
--   1. Los pedidos ya guardados quedan con su precio completo: total = platos + domicilio.
--   2. Borra de la base de datos todo lo de promociones: las columnas del descuento de cada
--      pedido, la lista de promociones de los ajustes y las funciones que calculaban el 20 %.
--   3. Reemplaza la función que guarda los pedidos: cobra platos + domicilio, sin descuentos.
-- =============================================================================
begin;

-- 1. full price on every saved order
update public.orders set total = subtotal + delivery where total <> subtotal + delivery;

-- 2. no trace of promotions
drop function if exists public.update_order(bigint, jsonb);
drop function if exists public.discount_eligibility(text);
drop function if exists public._eligibility(uuid, text);
alter table public.orders drop column if exists discount_kind;
alter table public.orders drop column if exists discount;
alter table public.settings drop column if exists promos;

-- 3. orders are saved at full price
alter table public.orders add column if not exists delivery_pending boolean not null default false;
create or replace function public.place_order(p jsonb) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  s public.settings;
  v_email text := trim(coalesce(p->>'email', ''));
  v_origin text := p->>'origin';
  v_sub int := (p->>'subtotal')::int;
  v_pending boolean := p->>'origin' = 'domicilio' and p->>'zone_id' = 'otro';
  v_delivery int := case when p->>'origin' = 'domicilio' and not coalesce(p->>'zone_id' = 'otro', false)
                         then coalesce((p->>'delivery')::int, 0) else 0 end;
  o public.orders;
  m_id bigint;
begin
  if uid is null then raise exception 'No autenticado.' using errcode = '28000'; end if;

  select * into s from public.settings where id = 1;
  if not s.store_open then raise exception 'La cocina está cerrada en este momento. Atendemos 11:30am – 4pm.'; end if;
  if char_length(trim(coalesce(p->>'name', ''))) = 0 then raise exception 'Falta tu nombre.'; end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'Falta un correo válido.'; end if;
  if v_origin is null or v_origin not in ('domicilio', 'recoger') then raise exception 'Modo de entrega inválido.'; end if;
  if jsonb_typeof(p->'items_list') <> 'array' or jsonb_array_length(p->'items_list') = 0 then raise exception 'Tu carrito está vacío.'; end if;
  if jsonb_typeof(p->'lines') <> 'array' then raise exception 'Pedido inválido.'; end if;
  if v_sub is null or v_sub < 0 or v_delivery < 0 then raise exception 'Valores inválidos.'; end if;
  if v_origin = 'domicilio' then
    if coalesce(p->>'zone_id', '') = '' then raise exception 'Selecciona tu barrio.'; end if;
    if v_pending and char_length(trim(coalesce(p->>'zone_label', ''))) = 0 then raise exception 'Escribe el nombre de tu barrio.'; end if;
    if char_length(trim(coalesce(p->>'address', ''))) = 0 then raise exception 'Escribe la dirección de entrega.'; end if;
  end if;
  if exists (select 1 from jsonb_array_elements(p->'lines') l where coalesce((s.sold_dishes ->> (l->>'dishId'))::boolean, false)) then
    raise exception 'Uno de los platos se agotó. Quítalo del carrito para continuar.';
  end if;
  if s.plato_dia is null and exists (select 1 from jsonb_array_elements(p->'lines') l where l->>'dishId' = 'dia') then
    raise exception 'El menú del día ya no está disponible. Quítalo del carrito para continuar.';
  end if;

  insert into public.orders (customer_id, name, email, phone, origin, zone_id, zone_label, address, address_notes,
                             items, items_list, lines, subtotal, delivery, delivery_pending, total, pay)
  values (uid, trim(p->>'name'), v_email, coalesce(nullif(trim(p->>'phone'), ''), '—'), v_origin,
          case when v_origin = 'domicilio' then p->>'zone_id' end,
          case when v_origin = 'domicilio' then left(trim(p->>'zone_label'), 80) end,
          case when v_origin = 'domicilio' then trim(p->>'address') else 'Recoge en el local' end,
          case when v_origin = 'domicilio' then trim(coalesce(p->>'address_notes', '')) else '' end,
          p->>'items', p->'items_list', p->'lines', v_sub,
          v_delivery, coalesce(v_pending, false), v_sub + v_delivery, coalesce(p->>'pay', 'Efectivo (contra entrega)'))
  returning * into o;

  insert into public.order_messages (order_num, sender, body)
  values (o.num, 'dueno', 'Hemos recibido tu pedido. Si necesitas algo, puedes escribirnos por este chat. 🙌')
  returning id into m_id;
  update public.orders set client_seen_id = m_id, owner_seen_id = m_id where num = o.num returning * into o;
  return o;
end $$;

revoke execute on function public.place_order(jsonb) from public, anon;
grant execute on function public.place_order(jsonb) to authenticated;

commit;

notify pgrst, 'reload schema';
