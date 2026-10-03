-- Adiciona a coluna price na tabela registrations
-- Necessária para o fluxo de pagamento usar o preço do KIT selecionado
-- (antes ele buscava apenas em race.distances, que não existe para eventos com kits).
ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);
