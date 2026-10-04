-- ============================================
-- DIAGNÓSTICO DAS POLÍTICAS RLS (versão corrigida)
-- ============================================
-- Contexto do erro original:
--   ERROR: 42883: function pg_get_policy_cmd("char") does not exist
--
-- Causa: pg_get_policy_cmd NÃO é uma função pública do PostgreSQL.
-- O comando da política fica em pg_policy.polcmd, como um byte "char"
-- (type "char") com os valores:
--   'r' -> SELECT | 'a' -> INSERT | 'd' -> DELETE | 'w' -> UPDATE | '*' -> ALL
-- A view canônica pg_policies já traz isso decodificado na coluna "cmd".
-- Além disso, ao passar colunas de tipo "char" (char) diretamente para
-- funções, o PostgreSQL pode falhar na resolução por incompatibilidade
-- de tipos — por isso os casts explícitos (::text) abaixo.
--
-- Execute no SQL Editor do Supabase (Dashboard → SQL Editor).
-- Esta query não precisa de LIMIT: retorna no máximo algumas centenas
-- de linhas (uma por política).


-- ------------------------------------------------------------
-- 1) Visão limpa: nome da política, tabela, comando e expressão
--    (usa a view canônica pg_policies — disponível desde o PG 9.5)
-- ------------------------------------------------------------
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,                                   -- SELECT / INSERT / UPDATE / DELETE / ALL
  permissive,                            -- PERMISSIVE | RESTRICTIVE
  roles::text            AS roles,       -- cast explícito evita problemas de tipo
  qual                   AS using_expr,  -- condição USING
  with_check             AS check_expr   -- condição WITH CHECK
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- ------------------------------------------------------------
-- 2) Mesma informação direto do catálogo (pg_policy), decodificando
--    polcmd manualmente — o substituto correto da função inexistente:
--      - pg_get_expr(polqual, polrelid)     renderiza a expressão USING
--      - pg_get_expr(polwithcheck, polrelid) renderiza a WITH CHECK
-- ------------------------------------------------------------
SELECT
  n.nspname                       AS schema,
  c.relname                       AS tabela,
  p.polname                       AS politica,
  CASE p.polcmd::text             -- cast explícito "char" -> text
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'd' THEN 'DELETE'
    WHEN 'w' THEN 'UPDATE'
    ELSE 'ALL'                 -- '*' e qualquer outro valor
  END                             AS comando,
  p.polpermissive                 AS permissiva,
  array_to_string(
    ARRAY(
      SELECT COALESCE(r.rolname, 'PUBLIC')
      FROM unnest(p.polroles) AS polrole(oid)
      LEFT JOIN pg_roles r ON r.oid = polrole.oid
    ), ', ')                       AS roles,
  pg_get_expr(p.polqual,   p.polrelid) AS using_expr,
  pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_expr
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
ORDER BY c.relname, p.polname;


-- ------------------------------------------------------------
-- 3) Auditoria rápida: tabelas com RLS habilitado mas SEM políticas
--    (essas ficam invisíveis para qualquer role não-superuser!)
-- ------------------------------------------------------------
SELECT c.relname AS tabela_sem_politica
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = true
  AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)
ORDER BY c.relname;


-- ------------------------------------------------------------
-- 4) Tabelas que NÃO têm RLS habilitado (potencial risco de exposição)
-- ------------------------------------------------------------
SELECT c.relname AS tabela_sem_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = false
ORDER BY c.relname;


-- ------------------------------------------------------------
-- Alternativa mínima, caso você queira apenas substituir a query que
-- falhou, mantendo a mesma forma (polcmd tratado como texto):
--
--   SELECT pol.polname,
--          CASE pol.polcmd::text
--            WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
--            WHEN 'd' THEN 'DELETE' WHEN 'w' THEN 'UPDATE'
--            ELSE 'ALL'
--          END AS cmd,
--          pg_get_expr(pol.polqual, pol.polrelid) AS using_expr
--     FROM pg_policy pol
--     JOIN pg_class cls ON cls.oid = pol.polrelid
--     JOIN pg_namespace ns ON ns.oid = cls.relnamespace
--    WHERE ns.nspname = 'public';
-- ============================================
