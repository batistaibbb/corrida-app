-- WhatsApp do organizador na tabela races.
-- Quando preenchido pelo admin, a página pública do evento passa a exibir o
-- botão "Falar no WhatsApp" para contato direto com o organizador.
-- Idempotente: pode ser executada mais de uma vez com segurança.

alter table public.races
  add column if not exists organizer_whatsapp text;

comment on column public.races.organizer_whatsapp is
  'Número de WhatsApp do organizador (somente dígitos, com DDI/DDD) — usado no link wa.me da página do evento';
