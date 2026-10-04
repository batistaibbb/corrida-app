-- Menor de idade: colunas de consentimento do responsável legal na tabela registrations.
-- Preenchidas pelo checkout quando a data de nascimento indica menos de 18 anos.
-- Idempotente: pode ser executada mais de uma vez com segurança.

alter table public.registrations
  add column if not exists is_minor boolean default false,
  add column if not exists responsible_name text,
  add column if not exists responsible_cpf text;

comment on column public.registrations.is_minor is
  'true quando o participante tem menos de 18 anos na data da inscrição';
comment on column public.registrations.responsible_name is
  'Nome completo do responsável legal (exigido para menores de 18)';
comment on column public.registrations.responsible_cpf is
  'CPF (somente dígitos) do responsável legal que consentiu com a participação do menor';
