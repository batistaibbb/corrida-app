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
