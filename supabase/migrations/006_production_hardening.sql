-- 006: Endurecimento para produção
-- 1) Preço da inscrição calculado NO SERVIDOR (cliente não define mais o valor)
-- 2) Participante não consegue inserir pagamento aprovado nem alterar status/preço
-- 3) Somente admin cria/edita/exclui eventos
-- 4) Evento com inscrições não pode ser excluído (FK RESTRICT + mensagem clara)
-- 5) search_path fixo nas funções apontadas pelo advisor

-- ---------------------------------------------------------------------------
-- 1) Preço calculado a partir de races.kits / races.distances + desconto
-- ---------------------------------------------------------------------------
create or replace function public.compute_registration_price(
  p_race_id uuid,
  p_kit_id text,
  p_kit_name text,
  p_distance numeric,
  p_distance_id text
) returns numeric
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
  kit jsonb;
  dist jsonb;
  base numeric;
  num_re constant text := '^[0-9]+(\.[0-9]+)?$';
begin
  select kits, distances, coalesce(discount, 0) as discount
    into r from public.races where id = p_race_id;
  if not found then return null; end if;

  if p_kit_id is not null then
    select k into kit
      from jsonb_array_elements(coalesce(r.kits, '[]'::jsonb)) k
     where k->>'id' = p_kit_id limit 1;
  end if;
  if kit is null and p_kit_name is not null then
    select k into kit
      from jsonb_array_elements(coalesce(r.kits, '[]'::jsonb)) k
     where k->>'name' = p_kit_name limit 1;
  end if;

  if kit is not null and (kit->>'price') ~ num_re then
    base := (kit->>'price')::numeric;
  end if;

  if base is null then
    select d into dist
      from jsonb_array_elements(coalesce(r.distances, '[]'::jsonb)) d
     where (p_distance_id is not null and d->>'id' = p_distance_id)
        or (p_distance is not null and (d->>'km') ~ num_re and (d->>'km')::numeric = p_distance)
     limit 1;
    if dist is not null and (dist->>'price') ~ num_re then
      base := (dist->>'price')::numeric;
    end if;
  end if;

  if base is null or base <= 0 then return null; end if;
  return round(base * (1 - least(greatest(r.discount, 0), 100) / 100.0), 2);
end;
$$;

revoke all on function public.compute_registration_price(uuid, text, text, numeric, text) from public, anon;
grant execute on function public.compute_registration_price(uuid, text, text, numeric, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Guarda de inscrições (insert/update)
-- ---------------------------------------------------------------------------
create or replace function public.registrations_guard()
returns trigger
language plpgsql
security definer
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

drop trigger if exists registrations_guard_trg on public.registrations;
create trigger registrations_guard_trg
  before insert or update on public.registrations
  for each row execute function public.registrations_guard();

-- ---------------------------------------------------------------------------
-- 3) Pagamentos: usuário só cria registro PENDENTE da própria inscrição
-- ---------------------------------------------------------------------------
drop policy if exists "Usuários podem criar pagamentos" on public.payments;
create policy "Usuários criam pagamentos pendentes" on public.payments
  for insert to authenticated
  with check (
    public.is_admin()
    or (
      status = 'pending'
      and paid_at is null
      and mercadopago_payment_id is null
      and exists (
        select 1 from public.registrations r
         where r.id = payments.registration_id
           and r.user_id = auth.uid()
           and r.status <> 'confirmed'
      )
    )
  );

-- O front não atualiza pagamentos; quem atualiza é o admin ou as Edge Functions (service role)
drop policy if exists "Usuários podem atualizar referências dos seus pagamentos" on public.payments;

-- ---------------------------------------------------------------------------
-- 4) Eventos: somente admin escreve
-- ---------------------------------------------------------------------------
drop policy if exists "Organizador/admin gerencia eventos" on public.races;
create policy "Admin gerencia eventos" on public.races
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5) Não excluir evento com inscrições
-- ---------------------------------------------------------------------------
alter table public.registrations drop constraint if exists registrations_race_id_fkey;
alter table public.registrations
  add constraint registrations_race_id_fkey
  foreign key (race_id) references public.races(id) on delete restrict;

create or replace function public.races_block_delete_with_registrations()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare n integer;
begin
  select count(*) into n from public.registrations where race_id = old.id;
  if n > 0 then
    raise exception 'Este evento possui % inscrição(ões) e não pode ser excluído. Despublique ou encerre as inscrições em vez de excluir.', n
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;

drop trigger if exists races_block_delete_trg on public.races;
create trigger races_block_delete_trg
  before delete on public.races
  for each row execute function public.races_block_delete_with_registrations();

-- ---------------------------------------------------------------------------
-- 6) Integridade: um mesmo pagamento do MP não pode ser ligado a duas linhas
-- ---------------------------------------------------------------------------
create unique index if not exists payments_mp_payment_id_uniq
  on public.payments (mercadopago_payment_id)
  where mercadopago_payment_id is not null;

-- ---------------------------------------------------------------------------
-- 7) Triggers que atualizam races precisam rodar como dono (RLS de races é só admin)
--    e com search_path fixo.
-- ---------------------------------------------------------------------------
alter function public.update_race_participants_count() security definer set search_path = public, pg_temp;
alter function public.update_race_rating() security definer set search_path = public, pg_temp;
alter function public.generate_confirmation_code() set search_path = public, pg_temp;
