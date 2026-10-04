-- ============================================================
-- ADD_PARTICIPANT_TO_REGISTRATIONS.sql
-- Executar no SQL Editor do Supabase (uma vez).
-- Adiciona os dados do PARTICIPANTE na tabela registrations,
-- para que o Relatório de Inscrições (admin) mostre nome, CPF,
-- telefone, e-mail e kit escolhido — essencial para distribuição
-- de kits e organização do evento.
-- Seguro para re-executar (IF NOT EXISTS / UPDATE condicional).
-- ============================================================

-- PASSO 0: cria as colunas dos dados do participante
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS participant_first_name text;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS participant_last_name  text;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS participant_email     text;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS participant_phone     text;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS participant_cpf       text;

-- PASSO 1: (opcional) preenche registros antigos com dados do perfil,
-- se a tabela profiles existir com essas colunas. Ajuste os nomes das
-- colunas de profiles conforme seu schema, se necessário.
UPDATE public.registrations r
SET
  participant_first_name = split_part(p.name, ' ', 1),
  participant_email      = p.email,
  participant_phone      = p.phone,
  participant_cpf        = p.cpf
FROM public.profiles p
WHERE p.id = r.user_id
  AND r.participant_first_name IS NULL;

-- PASSO 2: verificação rápida
SELECT id, confirmation_code, kit_name, price,
       participant_first_name, participant_last_name,
       participant_phone, participant_email, participant_cpf
FROM public.registrations
ORDER BY created_at DESC
LIMIT 20;
