-- Adiciona as colunas de KIT na tabela registrations
-- Necessárias para o fluxo de pagamento usar o preço do KIT selecionado
-- (antes ele buscava apenas em race.distances, que pode não existir para eventos com kits).
-- Execute TAMBÉM este script se a tela de pagamento ainda aparecer em branco/erro.

ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);

ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS kit_id TEXT;

ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS kit_name TEXT;

-- ============================================================
-- CORREÇÃO DE DADOS: kits/distâncias com price NULL no JSON do evento.
-- O app agora trata null com segurança, mas é recomendável popular os
-- preços faltantes para o checkout exibir o valor correto.
-- O bloco abaixo apenas DETECTA eventos com preços inválidos (não altera nada):
SELECT id, name,
  jsonb_array_elements(distances::jsonb) AS distance_item
FROM races
WHERE distances IS NOT NULL
  AND (jsonb_array_elements(distances::jsonb) ->> 'price') IS NULL;

SELECT id, name,
  jsonb_array_elements(kits::jsonb) AS kit_item
FROM races
WHERE kits IS NOT NULL
  AND (jsonb_array_elements(kits::jsonb) ->> 'price') IS NULL;

-- Se qualquer linha retornar acima, edite o evento no painel admin e preencha
-- o preço de cada kit/distância (ou atualize o JSON manualmente via SQL).
