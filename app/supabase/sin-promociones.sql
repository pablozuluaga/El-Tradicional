-- El Tradicional · sin promociones ni descuentos.
-- Para el proyecto que ya existe: pega TODO este archivo en Supabase → SQL Editor → Run (una sola vez).
-- Desde ahí ningún pedido nuevo recibe descuento, aunque en los ajustes quede alguna promoción vieja.
-- (schema.sql ya trae este cambio; correrlo completo también sirve.)
-- No promotions: the restaurant gives no discounts, so no order gets one (place_order and
-- discount_eligibility read this). The count of the customer's orders stays for reference.
create or replace function public._eligibility(p_uid uuid, p_email text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  n int;
begin
  select count(*) into n from public.orders where customer_id = p_uid and status <> 'rechazado';
  return jsonb_build_object('rate', 0, 'kind', null, 'count', n);
end $$;
