-- Adiciona as colunas de KIT na tabela registrations
-- Necessárias para o fluxo de pagamento usar o preço do KIT selecionado
-- (antes ele buscava apenas em race.distances, que pode não existir para eventos com kits).

-- ============================================================
-- PASSO 0: Criar as colunas (seguro para re-executar)
ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);

ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS kit_id TEXT;

ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS kit_name TEXT;

-- ============================================================
-- PASSO 1: Preencher price = 0 nas inscrições antigas que ficaram com price NULL
-- (sem isso a tela de pagamento pode quebrar ao formatar o valor).
UPDATE public.registrations
SET price = 0
WHERE price IS NULL;

-- ============================================================
-- PASSO 2 (OPCIONAL - DIAGNÓSTICO): detectar eventos com kits/distâncias sem preço.
-- Obs.: usa LATERAL porque set-returning functions não são permitidas em WHERE
-- (erro "set-returning functions are not allowed in WHERE").
-- Apenas lista os problemas (não altera nada):

-- Distâncias sem preço válido:
SELECT r.id, r.name, d.value AS distance_item
FROM races r,
     LATERAL jsonb_array_elements(r.distances::jsonb) AS d(value)
WHERE r.distances IS NOT NULL
  AND ((d.value ->> 'price') IS NULL
    OR (d.value ->> 'price') IN ('', 'null', 'NaN'));

-- Kits sem preço válido:
SELECT r.id, r.name, k.value AS kit_item
FROM races r,
     LATERAL jsonb_array_elements(r.kits::jsonb) AS k(value)
WHERE r.kits IS NOT NULL
  AND ((k.value ->> 'price') IS NULL
    OR (k.value ->> 'price') IN ('', 'null', 'NaN'));

-- ============================================================
-- PASSO 3 (OPCIONAL - CORREÇÃO AUTOMÁTICA):
-- Se você preferir corrigir direto no banco (em vez do painel admin),
-- descomente e execute após conferir os resultados do PASSO 2.
-- Define price = 0 nos itens de kit sem preço:
/*
UPDATE races r
SET kits = (
  SELECT jsonb_agg(
    CASE
      WHEN (k.value ->> 'price') IS NULL
        OR (k.value ->> 'price') IN ('', 'null', 'NaN')
      THEN jsonb_set(k.value, '{price}', '0'::jsonb)
      ELSE k.value
    END
  )
  FROM jsonb_array_elements(r.kits::jsonb) AS k(value)
)
WHERE r.kits IS NOT NULL;
*/

-- Se qualquer linha retornar no PASSO 2, o ideal é editar o evento no painel
-- admin e preencher o preço de cada kit/distância com o valor correto.
