-- Auditoria UX P6: campos de retirada do kit na tabela races.
-- Exibidos no comprovante/QR Code do participante e na página "Minhas Inscrições".
-- Idempotente: pode ser executada mais de uma vez com segurança.

alter table public.races
  add column if not exists kit_pickup text,
  add column if not exists kit_pickup_location text;

comment on column public.races.kit_pickup is
  'Data/horário de retirada do kit (texto livre exibido no comprovante do participante)';
comment on column public.races.kit_pickup_location is
  'Local de retirada do kit (texto livre exibido no comprovante do participante)';
