-- 007: corrige registrations_guard. Em SECURITY DEFINER, current_user vira o dono da função
-- e o guard nunca reconhecia chamadas da API (anon/authenticated). Agora roda como INVOKER.
create or replace function public.registrations_guard()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  api boolean := current_user in ('anon', 'authenticated');
  adm boolean := false;
  rc record;
  p numeric;
begin
  if api then adm := public.is_admin(); end if;

  if tg_op = 'INSERT' then
    if api and not adm then
      select published, registration_status, date into rc
        from public.races where id = new.race_id;
      if not found or not coalesce(rc.published, false)
         or rc.registration_status is distinct from 'upcoming' then
        raise exception 'As inscrições deste evento não estão abertas.' using errcode = 'P0001';
      end if;
      if rc.date < (now() at time zone 'America/Sao_Paulo')::date then
        raise exception 'Este evento já foi realizado.' using errcode = 'P0001';
      end if;
      new.status := 'pending_payment';
      new.payment_id := null;
    end if;

    p := public.compute_registration_price(new.race_id, new.kit_id, new.kit_name, new.distance, new.distance_id);
    if p is null then
      raise exception 'O kit selecionado está sem preço válido.' using errcode = 'P0001';
    end if;
    new.price := p;
    return new;
  end if;

  -- UPDATE
  if api and not adm then
    if new.price is distinct from old.price
       or new.payment_id is distinct from old.payment_id
       or new.race_id is distinct from old.race_id
       or new.user_id is distinct from old.user_id
       or new.kit_id is distinct from old.kit_id
       or new.kit_name is distinct from old.kit_name
       or new.distance is distinct from old.distance
       or new.distance_id is distinct from old.distance_id
       or new.confirmation_code is distinct from old.confirmation_code then
      raise exception 'Alteração não permitida nesta inscrição.' using errcode = '42501';
    end if;
    if new.status is distinct from old.status
       and not (old.status = 'pending_payment' and new.status = 'cancelled') then
      raise exception 'Alteração de status não permitida.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- Funções de trigger SECURITY DEFINER não devem ser chamáveis via /rest/v1/rpc
revoke execute on function public.races_block_delete_with_registrations() from public, anon, authenticated;
revoke execute on function public.update_race_participants_count() from public, anon, authenticated;
revoke execute on function public.update_race_rating() from public, anon, authenticated;

alter function public.protect_profile_role() set search_path = public, pg_temp;
alter function public.force_default_profile_role() set search_path = public, pg_temp;
