-- Assertions for schema.sql, run as different JWT subjects (see run.sh).
\set owner '00000000-0000-0000-0000-00000000000a'
\set cust_a '00000000-0000-0000-0000-00000000000b'
\set cust_b '00000000-0000-0000-0000-00000000000c'
\set cust_a2 '00000000-0000-0000-0000-00000000000d'
\set cust_e '00000000-0000-0000-0000-00000000000e'

insert into auth.users (id, email, is_anonymous) values
  (:'owner', 'dueno@example.com', false), (:'cust_a', null, true), (:'cust_b', null, true),
  (:'cust_a2', null, true), (:'cust_e', null, true);
insert into public.owners (user_id) values (:'owner');

-- payload builder used by the tests
create function public.t_payload(p_email text, p_origin text default 'domicilio', p_dish text default 'paisa', p_sub int default 35000)
returns jsonb language sql as $$
  select jsonb_build_object('name', 'Ana Pérez', 'email', p_email, 'phone', '3001234567', 'origin', p_origin,
    'zone_id', 'obrero', 'zone_label', 'El Obrero', 'address', 'Calle 1', 'address_notes', 'Portería',
    'items', '1 Plato', 'items_list', jsonb_build_array('1× Plato'),
    'lines', jsonb_build_array(jsonb_build_object('dishId', p_dish, 'name', 'Plato', 'qty', 1, 'unit', p_sub)),
    'subtotal', p_sub, 'delivery', 3000, 'pay', 'Efectivo (contra entrega)')
$$;
grant execute on function public.t_payload(text, text, text, int) to authenticated, anon;

-- 1. anonymous visitor: can read settings, cannot write, cannot call RPCs
begin;
set local role anon;
do $$ begin
  assert (select store_open from public.settings where id = 1), 'anon reads settings';
  assert (select jsonb_array_length(promos) from public.settings) = 2, 'seeded promos';
  begin update public.settings set store_open = false; assert false, 'anon update must fail';
  exception when insufficient_privilege then null; end;
  begin perform public.place_order(public.t_payload('x@example.com')); assert false, 'anon place_order must fail';
  exception when insufficient_privilege then null; end;
end $$;
commit;

-- 2. customer A: first order gets the welcome 20%, second doesn't
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'cust_a')::text, true);
do $$
declare o public.orders; e jsonb;
begin
  e := public.discount_eligibility('ana@example.com');
  assert e->>'kind' = 'primer' and (e->>'rate')::numeric = 0.2, 'welcome eligible: ' || e;
  o := public.place_order(public.t_payload('ana@example.com'));
  assert o.num = 1043, 'numbering starts at 1043';
  assert o.discount = 7000 and o.discount_kind = 'primer' and o.total = 35000 - 7000 + 3000, 'welcome discount applied';
  assert o.customer_id = auth.uid(), 'owned by caller';
  assert (select count(*) from public.order_messages where order_num = o.num) = 1, 'welcome message';
  assert o.client_seen_id = o.owner_seen_id and o.client_seen_id > 0, 'seen ids set';
  o := public.place_order(public.t_payload('ana@example.com', 'recoger', 'trucha'));
  assert o.num = 1044 and o.discount = 0 and o.discount_kind is null, 'no second discount';
  assert o.delivery = 0 and o.zone_id is null and o.address = 'Recoge en el local', 'pickup ignores delivery/address';
  -- settings: RLS silently blocks a customer update
  update public.settings set store_open = false;
  assert (select store_open from public.settings), 'customer cannot close the store';
  begin insert into public.orders (customer_id, name, email, origin, items, subtotal, total, pay)
        values (auth.uid(), 'x', 'x@x.co', 'recoger', 'x', 1, 1, 'x'); assert false, 'direct insert must fail';
  exception when insufficient_privilege then null; end;
  begin update public.orders set status = 'listo' where num = 1043; assert false, 'direct update must fail';
  exception when insufficient_privilege then null; end;
  begin perform public.advance_order(1043); assert false, 'customer cannot advance';
  exception when insufficient_privilege then null; end;
end $$;
commit;

-- 3. customer B sees nothing of A and cannot touch A's orders
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'cust_b')::text, true);
do $$ begin
  assert (select count(*) from public.orders) = 0, 'B cannot see A orders';
  assert (select count(*) from public.order_messages) = 0, 'B cannot see A messages';
  begin perform public.send_message(1043, 'hola'); assert false, 'B cannot message A order';
  exception when insufficient_privilege then null; end;
  begin perform public.set_review(1043, 5, 'x', true); assert false, 'B cannot review A order';
  exception when insufficient_privilege then null; end;
  assert (public.discount_eligibility('otra@example.com')->>'rate')::numeric = 0.2, 'other email still gets welcome';
end $$;
commit;

-- 4. same email on a new device: no second welcome discount
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'cust_a2')::text, true);
do $$ declare o public.orders; begin
  assert public.discount_eligibility(' ANA@example.com')->>'kind' is null, 'welcome blocked by email';
  o := public.place_order(public.t_payload('Ana@Example.com'));
  assert o.discount = 0, 'server refuses the reused welcome discount';
end $$;
commit;

-- 5. owner: sees everything, advances, rejects, chats
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'owner')::text, true);
do $$ declare o public.orders; m public.order_messages; begin
  assert public.is_owner(), 'owner recognised';
  assert (select count(*) from public.orders) = 3, 'owner sees all orders';
  o := public.advance_order(1043);
  assert o.status = 'aceptado', 'advanced to aceptado';
  assert (select body from public.order_messages where order_num = 1043 order by id desc limit 1) like 'Pedido confirmado%', 'auto note';
  o := public.advance_order(1044); o := public.advance_order(1044);
  assert o.status = 'camino', 'pickup at camino';
  assert (select body from public.order_messages where order_num = 1044 order by id desc limit 1) like '%listo para recoger%', 'pickup note';
  begin perform public.reject_order(1044, 'x'); assert false, 'cannot reject en camino';
  exception when raise_exception then null; end;
  o := public.reject_order(1045, '  se agotó  ');
  assert o.status = 'rechazado' and o.reject_reason = 'se agotó', 'rejected with reason';
  m := public.send_message(1043, '¡Hola!');
  assert m.sender = 'dueno', 'owner messages are dueno';
  assert (select owner_seen_id from public.orders where num = 1043) = m.id, 'sender side marked seen';
  update public.settings set juices = '[{"id":"jugo","label":"Jugo","out":true}]'::jsonb where id = 1;
  assert (select juices->0->>'out' from public.settings) = 'true', 'owner can update settings';
  o := public.advance_order(1044); o := public.advance_order(1044);
  assert o.status = 'listo', 'end of flow is idempotent';
end $$;
commit;

-- 6. customer A: chat, seen, review, closed store, sold-out dish
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'cust_a')::text, true);
do $$ declare m public.order_messages; o public.orders; begin
  assert (select count(*) from public.orders) = 2, 'A sees only own orders';
  assert (select count(*) from public.order_messages where order_num = 1043) = 3, 'A sees own chat incl. owner reply';
  perform public.mark_seen(1043);
  assert (select client_seen_id from public.orders where num = 1043) = (select max(id) from public.order_messages where order_num = 1043), 'mark_seen';
  m := public.send_message(1043, '  gracias  ');
  assert m.sender = 'cliente' and m.body = 'gracias', 'customer message';
  assert (select owner_seen_id from public.orders where num = 1043) < m.id, 'owner has unread';
  o := public.set_review(1043, 9, '  Muy rico ', null);
  assert o.review_stars = 5 and o.review_comment = 'Muy rico' and not o.rated, 'stars clamped';
  o := public.set_review(1043, null, null, true);
  assert o.rated and o.review_stars = 5, 'rated keeps stars';
  assert (public.discount_eligibility('ana@example.com')->>'count')::int = 2, 'count excludes nothing yet';
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'owner')::text, true);
update public.settings set store_open = false, sold_dishes = '{"trucha": true}'::jsonb, plato_dia = null where id = 1;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'cust_b')::text, true);
do $$ begin
  begin perform public.place_order(public.t_payload('b@example.com')); assert false, 'closed store blocks orders';
  exception when raise_exception then assert sqlerrm like 'La cocina está cerrada%', sqlerrm; end;
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'owner')::text, true);
update public.settings set store_open = true where id = 1;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'cust_b')::text, true);
do $$ begin
  begin perform public.place_order(public.t_payload('b@example.com', 'recoger', 'trucha')); assert false, 'sold-out dish blocked';
  exception when raise_exception then assert sqlerrm like '%se agotó%', sqlerrm; end;
  begin perform public.place_order(public.t_payload('b@example.com', 'recoger', 'dia')); assert false, 'removed daily menu blocked';
  exception when raise_exception then assert sqlerrm like '%menú del día%', sqlerrm; end;
  begin perform public.place_order(public.t_payload('b@example.com', 'domicilio') - 'zone_id'); assert false, 'barrio required';
  exception when raise_exception then assert sqlerrm = 'Selecciona tu barrio.', sqlerrm; end;
  begin perform public.place_order(public.t_payload('no-es-correo')); assert false, 'email required';
  exception when raise_exception then null; end;
end $$;
commit;

-- 7. loyalty: after 10 orders, the 11th gets the 'diez' reward; a rejected order doesn't count
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'cust_e')::text, true);
do $$ declare o public.orders; i int; begin
  for i in 1..10 loop o := public.place_order(public.t_payload('e@example.com', 'recoger', 'paisa', 20000)); end loop;
  assert (select count(*) filter (where discount > 0) from public.orders) = 1, 'only the first had a discount';
  assert public.discount_eligibility('e@example.com')->>'kind' = 'diez', 'reward ready';
  o := public.place_order(public.t_payload('e@example.com', 'recoger', 'paisa', 20000));
  assert o.discount = 4000 and o.discount_kind = 'diez' and o.total = 16000, '11th order rewarded';
  assert public.discount_eligibility('e@example.com')->>'kind' is null, 'reward used';
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'owner')::text, true);
select public.reject_order(max(num), 'prueba') from public.orders where customer_id = :'cust_e';
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'cust_e')::text, true);
do $$ begin
  assert public.discount_eligibility('e@example.com')->>'kind' = 'diez', 'rejected reward order gives the benefit back';
end $$;
commit;

drop function public.t_payload(text, text, text, int);
