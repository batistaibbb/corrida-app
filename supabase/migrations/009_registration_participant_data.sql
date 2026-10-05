-- 009: grava dados do participante hoje descartados (nascimento, sexo, endereço) e
-- o aceite dos termos / declaração médica com carimbo de data feito PELO SERVIDOR.
alter table public.registrations
  add column if not exists birth_date date,
  add column if not exists gender text,
  add column if not exists address text,
  add column if not exists address_city text,
  add column if not exists address_state text,
  add column if not exists zip_code text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists medical_declaration_at timestamptz;

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
      if new.terms_accepted_at is null or new.medical_declaration_at is null then
        raise exception 'É necessário aceitar os termos de uso e a declaração médica.' using errcode = 'P0001';
      end if;
      -- carimbo de data/hora definido pelo servidor (o cliente não escolhe a data do aceite)
      new.terms_accepted_at := now();
      new.medical_declaration_at := now();
      new.status := 'pending_payment';
      new.payment_id := null;
      if new.birth_date is not null then
        new.is_minor := (new.birth_date > ((now() at time zone 'America/Sao_Paulo')::date - interval '18 years')::date);
      end if;
    end if;

    p := public.compute_registration_price(new.race_id, new.kit_id, new.kit_name, new.distance, new.distance_id);
    if p is null then
      raise exception 'O kit selecionado está sem preço válido.' using errcode = 'P0001';
    end if;
    new.price := p;
    return new;
  end if;

  if api and not adm then
    if new.price is distinct from old.price
       or new.payment_id is distinct from old.payment_id
       or new.race_id is distinct from old.race_id
       or new.user_id is distinct from old.user_id
       or new.kit_id is distinct from old.kit_id
       or new.kit_name is distinct from old.kit_name
       or new.distance is distinct from old.distance
       or new.distance_id is distinct from old.distance_id
       or new.confirmation_code is distinct from old.confirmation_code
       or new.terms_accepted_at is distinct from old.terms_accepted_at
       or new.medical_declaration_at is distinct from old.medical_declaration_at then
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
