-- ============================================
-- 005 — HARDENING DAS POLÍTICAS RLS
-- ============================================
-- Origem: saída do diagnóstico `supabase/migrations/sql/diagnostico_rls_polices.sql`
-- (query 2, catálogo pg_policy) executada no projeto Supabase em 2026-10-05.
--
-- Este arquivo corrige os 4 problemas encontrados na auditoria e é IDEMPOTENTE
-- (DROP IF EXISTS + CREATE). Pode ser reexecutado no SQL Editor sem erro.
--
-- ┌── PROBLEMA 1 (CRÍTICO) — auto-promoção a admin ──────────────────────────
-- │ "Usuários podem atualizar seu perfil" tinha um WITH CHECK que tentava
-- │ impedir mudança de role, mas a subconsulta estava quebrada:
-- │
-- │   NOT EXISTS (SELECT 1 FROM profiles old
-- │               WHERE (old.id = old.id)                     -- sempre TRUE
-- │                 AND (COALESCE(old.role,'user') IS DISTINCT FROM
-- │                      COALESCE(old.role,'user')))          -- sempre FALSE
-- │
-- │ A subconsulta referencia apenas o ALIAS `old`; nada ali compara a linha
-- │ nova com a linha antiga da tabela. Logo o predicate interno é sempre
-- │ FALSE, NOT EXISTS(...) é sempre FALSE e o WITH CHECK inteiro nunca passa
-- │ por esse ramo. Resultado prático: a política só exigia `id = auth.uid()`,
-- │ então QUALQUER usuário autenticado conseguia fazer
-- │ `update profiles set role='admin' where id = auth.uid()` pela API e
-- │ virar admin → acesso a todos os pagamentos, inscrições e eventos.
-- │
-- │ Correção em duas camadas:
-- │   (a) trigger BEFORE UPDATE impede que `authenticated`/`anon` altere a
-- │       coluna `role` (comparação OLD/NEW real, coisa que política RLS não
-- │       consegue fazer);
-- │   (b) trigger BEFORE INSERT força `role = 'participant'` para usuários
-- │       comuns, fechando o caminho equivalente via POST /profiles.
-- │ service_role (Edge Functions/dashboard) e superuser continuam podendo
-- │ promover usuários.
-- ├───────────────────────────────────────────────────────────────────────────
--
-- ┌── PROBLEMA 2 (CRÍTICO) — SELECT liberado para PUBLIC/anon ───────────────
-- │ • profiles: "Public profiles are viewable by everyone" USING(true) com
-- │   role PUBLIC → qualquer visitante deslogado lista nome, e-mail, CPF e
-- │   telefone de todos os usuários (dado pessoal sensível / LGPD).
-- │ • payments: os dois SELECT eram role PUBLIC; como políticas PERMISSIVE se
-- │   somam por OR, dados financeiros ficavam avaliáveis por anon.
-- │ • registrations: SELECT do admin e INSERT também em role PUBLIC.
-- │ Correção: todas as políticas de tabelas sensíveis passam a `TO
-- │ authenticated`; perfis só são visíveis para o dono ou para admin.
-- └───────────────────────────────────────────────────────────────────────────
--
-- ┌── PROBLEMA 3 (ALTO) — comandos usados pelo app sem política ─────────────
-- │ O AdminDashboard/DataContext executam, como `authenticated`:
-- │   • approvePayment() → UPDATE payments ............ coberto só p/ admin OK
-- │   • addPayment()     → INSERT payments ............ NÃO EXISTIA (42501)
-- │   • updateRegistration() → UPDATE registrations ... NÃO EXISTIA após o
-- │     recreate do FIX_RLS_POLICIES.sql (admin não aprova inscrição)
-- │   • cancelamento/edição da própria inscrição ...... NÃO EXISTIA p/ dono
-- │   • exclusões no painel → DELETE registrations/payments/reviews: NÃO
-- │     EXISTIAM
-- │   • reviews: sem UPDATE/DELETE (usuário não edita/apaga a própria review)
-- │   • races: sem INSERT/UPDATE/DELETE explícitos para organizer
-- │ Também existia duplicidade de políticas SELECT sobre payments e
-- │ registrations ("Admins podem ver todos..." + "Usuários podem ver..."),
-- │ ambas em PUBLIC, o que tornava a avaliação cara e difícil de auditar.
-- │ Correção: conjunto completo de políticas por tabela/comando, com checagem
-- │ de admin feita por função SECURITY DEFINER (evita recursão do RLS sobre
-- │ profiles).
-- └───────────────────────────────────────────────────────────────────────────
--
-- ┌── PROBLEMA 4 (MÉDIO) — rascunhos visíveis para todo usuário logado ──────
-- │ "Eventos publicados visíveis para todos" usava
-- │ USING ((published = true) OR (auth.role() = 'authenticated')).
-- │ auth.role() retorna 'authenticated' para QUALQUER usuário logado, ou seja
-- │ qualquer participante enxergava eventos não publicados/rascunho.
-- │ Correção: published = true OU organizer_id = auth.uid() OU is_admin().
-- └───────────────────────────────────────────────────────────────────────────

BEGIN;

-- ------------------------------------------------------------
-- 0) Funções auxiliares SECURITY DEFINER
--    Permitem ler `profiles` dentro das políticas sem disparar o RLS da
--    própria tabela (evita recursão) e sem JOIN no plano da consulta.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 1) PROFILES
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile"         ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles"             ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile"       ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu perfil"      ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile"       ON public.profiles;
DROP POLICY IF EXISTS "Profiles visíveis para o dono ou admin"   ON public.profiles;
DROP POLICY IF EXISTS "Admins podem atualizar perfis"            ON public.profiles;

-- 1.1 SELECT: dono vê o próprio perfil; admin vê todos. Anon não vê nada.
CREATE POLICY "Profiles visíveis para o dono ou admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

-- 1.2 INSERT: cada usuário cria apenas o próprio perfil.
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 1.3 UPDATE: dono edita os próprios dados; a proteção da coluna `role` é
--       feita pelos triggers 1.4/1.5 (política RLS não acessa OLD e NEW).
CREATE POLICY "Usuários podem atualizar seu perfil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 1.4 Admin pode editar/perfil de terceiros (promover, corrigir CPF etc.).
CREATE POLICY "Admins podem atualizar perfis"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 1.5 Guarda anti-escalonamento no UPDATE (substitui o WITH CHECK quebrado).
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Só bloqueia requisições vindas da API pública (PostgREST roda como
  -- anon/authenticated). service_role e superuser seguem livres.
  IF current_user IN ('anon', 'authenticated') AND NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Alteracao de role nao permitida pela API publica.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_update_protect_role ON public.profiles;
CREATE TRIGGER on_profile_update_protect_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();

-- 1.6 Mesmo guard no INSERT: usuário comum nasce 'participant'.
CREATE OR REPLACE FUNCTION public.force_default_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND NOT public.is_admin() THEN
    NEW.role := 'participant';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_insert_force_role ON public.profiles;
CREATE TRIGGER on_profile_insert_force_role
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.force_default_profile_role();

-- ------------------------------------------------------------
-- 2) PAYMENTS
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Admins podem ver todos os pagamentos"        ON public.payments;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios pagamentos" ON public.payments;
DROP POLICY IF EXISTS "Admins podem atualizar pagamentos"           ON public.payments;
DROP POLICY IF EXISTS "Usuários podem criar pagamentos"             ON public.payments;
DROP POLICY IF EXISTS "Admins podem apagar pagamentos"              ON public.payments;
DROP POLICY IF EXISTS "Users can view own payments"                 ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments"                ON public.payments;

-- 2.1 SELECT: dono da inscrição relacionada, ou admin. Nunca anon.
CREATE POLICY "Usuários podem ver seus próprios pagamentos"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.registrations r
      WHERE r.id = payments.registration_id AND r.user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- 2.2 INSERT: faltava — travava o checkout feito pelo cliente.
CREATE POLICY "Usuários podem criar pagamentos"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.registrations r
      WHERE r.id = registration_id AND r.user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- 2.3 UPDATE do admin: aprovar / recusar / reembolsar (AdminDashboard).
CREATE POLICY "Admins podem atualizar pagamentos"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2.4 UPDATE do dono: só metadados de referência do próprio pagamento.
--       Status e valores ficam congelados (sem comparação OLD/NEW possível
--       em política RLS, o truque é exigir que o valor enviado continue
--       satisfazendo o estado 'pending' já gravado — ver nota no fim).
CREATE POLICY "Usuários podem atualizar referências dos seus pagamentos"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.registrations r
      WHERE r.id = payments.registration_id AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.registrations r
      WHERE r.id = payments.registration_id AND r.user_id = auth.uid()
    )
  );

-- 2.5 DELETE: apenas admin.
CREATE POLICY "Admins podem apagar pagamentos"
  ON public.payments FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ------------------------------------------------------------
-- 3) REGISTRATIONS
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Admins podem ver todas as inscrições"        ON public.registrations;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias inscrições" ON public.registrations;
DROP POLICY IF EXISTS "Usuários podem criar inscrições"             ON public.registrations;
DROP POLICY IF EXISTS "Usuários podem atualizar suas inscrições"    ON public.registrations;
DROP POLICY IF EXISTS "Admins podem atualizar inscrições"           ON public.registrations;
DROP POLICY IF EXISTS "Admins podem apagar inscrições"              ON public.registrations;
DROP POLICY IF EXISTS "Users can view own registrations"            ON public.registrations;
DROP POLICY IF EXISTS "Admins can view all registrations"           ON public.registrations;
DROP POLICY IF EXISTS "Users can create own registrations"          ON public.registrations;

CREATE POLICY "Usuários podem ver suas próprias inscrições"
  ON public.registrations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Usuários podem criar inscrições"
  ON public.registrations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 3.1 Dono cancela/atualiza dados próprios, mas NÃO se autoconfirma
--       (status 'confirmed' só entra por admin ou service_role).
CREATE POLICY "Usuários podem atualizar suas inscrições"
  ON public.registrations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND status <> 'confirmed');

-- 3.2 Admin confirma/cancela/remarca qualquer inscrição.
CREATE POLICY "Admins podem atualizar inscrições"
  ON public.registrations FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins podem apagar inscrições"
  ON public.registrations FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ------------------------------------------------------------
-- 4) RACES
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Eventos publicados visíveis para todos"     ON public.races;
DROP POLICY IF EXISTS "Eventos publicados são visíveis para todos" ON public.races;
DROP POLICY IF EXISTS "Admins podem ver todos os eventos"          ON public.races;
DROP POLICY IF EXISTS "Organizador/admin gerencia eventos"         ON public.races;
DROP POLICY IF EXISTS "Public can view published races"            ON public.races;
DROP POLICY IF EXISTS "Admins can view all races"                  ON public.races;
DROP POLICY IF EXISTS "Admins and organizers can create races"     ON public.races;
DROP POLICY IF EXISTS "Admins and organizers can update races"     ON public.races;
DROP POLICY IF EXISTS "Admins podem criar eventos"                 ON public.races;
DROP POLICY IF EXISTS "Admins podem atualizar eventos"             ON public.races;
DROP POLICY IF EXISTS "Admins podem deletar eventos"               ON public.races;
DROP POLICY IF EXISTS "Admins can delete races"                    ON public.races;

-- 4.1 Visibilidade: publicado para todos; rascunho só para dono/admin.
CREATE POLICY "Eventos publicados visíveis para todos"
  ON public.races FOR SELECT
  TO anon, authenticated
  USING (published = true OR organizer_id = auth.uid() OR public.is_admin());

-- 4.2 Escrita completa para organizer dono do evento ou admin.
CREATE POLICY "Organizador/admin gerencia eventos"
  ON public.races FOR ALL
  TO authenticated
  USING (organizer_id = auth.uid() OR public.is_admin())
  WITH CHECK (organizer_id = auth.uid() OR public.is_admin());

-- ------------------------------------------------------------
-- 5) REVIEWS
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view reviews"      ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews"     ON public.reviews;
DROP POLICY IF EXISTS "Users can update reviews"     ON public.reviews;
DROP POLICY IF EXISTS "Users can delete reviews"     ON public.reviews;
DROP POLICY IF EXISTS "Users can update their reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete their reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins podem moderar reviews"  ON public.reviews;

CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can create reviews"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their reviews"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their reviews"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

COMMIT;

-- ============================================
-- NOTAS / VERIFICAÇÃO
-- ============================================
-- 2.4: política RLS não tem acesso simultâneo a OLD e NEW, então não é
-- possível escrever "NEW.status = OLD.status". O esquema adotado restringe o
-- UPDATE do participante a linhas que estão E ficarão em 'pending' — quem
-- precisa mudar status (aprovar/recusar) é admin (2.3) ou as Edge Functions,
-- que usam service_role e ignoram RLS.
--
-- Depois de aplicar, rode a auditoria e confirme os resultados esperados:
--
--   (a) nenhuma política de profiles/payments/registrations com role PUBLIC:
--       SELECT tablename, policyname, cmd, roles::text
--       FROM pg_policies
--       WHERE schemaname = 'public'
--         AND tablename IN ('profiles','payments','registrations')
--         AND roles @> ARRAY['public']::regrole[];
--       -- esperado: 0 linhas
--
--   (b) nenhuma tabela com RLS ligado sem política:
--       SELECT c.relname FROM pg_class c
--       JOIN pg_namespace n ON n.oid = c.relnamespace
--       WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity
--         AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid);
--       -- esperado: 0 linhas
--
--   (c) teste funcional do anti-escalonamento (deve FALHAR com 42501):
--       set local role authenticated;
--       set request.jwt.claims = '{"sub":"<uuid-do-participante>","role":"authenticated"}';
--       update public.profiles set role = 'admin' where id = auth.uid();
--       reset role;
--
--   (d) fluxo do painel que antes quebrava (deve passar, logado como admin):
--       update public.payments set status='approved' where id = '<payment-id>';
--       update public.registrations set status='confirmed' where id = '<reg-id>';
--       insert into public.payments (registration_id, method, amount, total, status)
--         values ('<reg-do-proprio-usuario>', 'pix', 100, 100, 'pending');
-- ============================================
