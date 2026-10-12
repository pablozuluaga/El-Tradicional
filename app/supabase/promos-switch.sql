-- El Tradicional · apagar una promoción quita su descuento.
-- Para un proyecto que ya existe: pega TODO este archivo en Supabase → SQL Editor → Run (una sola vez).
-- (schema.sql ya trae este cambio; correrlo completo también sirve.)
-- Loyalty rule (same as src/domain/loyalty.ts): 20% when this customer's non-rejected
-- orders are a multiple of 10; the welcome one (count = 0) only if the email has no
-- orders from another account. Each benefit applies only while its promotion ('primer',
-- 'diez') is switched on in the owner panel.
create or replace function public._eligibility(p_uid uuid, p_email text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  n int;
  used boolean;
  kind text;
begin
  select count(*) into n from public.orders where customer_id = p_uid and status <> 'rechazado';
  used := n = 0 and exists (
    select 1 from public.orders
    where lower(email) = lower(trim(coalesce(p_email, ''))) and customer_id <> p_uid and status <> 'rechazado');
  kind := case when n % 10 <> 0 or used then null when n = 0 then 'primer' else 'diez' end;
  if kind is not null and not exists (
    select 1 from public.settings s, jsonb_array_elements(coalesce(s.promos, '[]'::jsonb)) pr
    where s.id = 1 and pr->>'id' = kind and coalesce((pr->>'active')::boolean, false)) then
    kind := null;
  end if;
  return jsonb_build_object('rate', case when kind is null then 0 else 0.2 end, 'kind', kind, 'count', n);
end $$;
