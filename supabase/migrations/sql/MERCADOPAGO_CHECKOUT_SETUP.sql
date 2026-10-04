-- ============================================
-- MERCADO PAGO CHECKOUT - SQL NECESSÁRIO
-- ============================================
-- Execute este script no SQL Editor do Supabase ANTES de usar o checkout.
-- Seguro para re-executar (usa IF NOT EXISTS).

-- 1) Coluna para armazenar a URL do checkout Mercado Pago na tabela payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS mp_init_point TEXT;

-- Garanta que o status 'refunded' é aceito (o CHECK original já inclui, mas
-- caso seu banco tenha sido criado sem ele, recriamos a constraint):
DO $$
BEGIN
  ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
  ALTER TABLE public.payments
    ADD CONSTRAINT payments_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'refunded'));
END $$;

-- 2) Índice para lookup rápido do webhook por payment_id do Mercado Pago
CREATE INDEX IF NOT EXISTS idx_payments_mp_payment_id
  ON public.payments (mercadopago_payment_id);

-- 3) Libere UPDATE/DELETE na tabela payments para o serviço (webhook usa
--    service_role, que bypassa RLS — nada a fazer aqui se você usa service key).
--    Se algum dia precisar, as policies admin já existem no schema inicial.

-- 4) Verificação
SELECT column_name FROM information_schema.columns
WHERE table_name = 'payments' AND column_name IN ('mp_init_point', 'mercadopago_payment_id');
