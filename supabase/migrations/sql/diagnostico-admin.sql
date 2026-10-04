-- ============================================
-- DIAGNÓSTICO E CORREÇÃO DO USUÁRIO ADMIN
-- ============================================

-- 1. Verificar se o usuário existe no Auth
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'admin@runbrasil.com.br';

-- 2. Verificar o perfil
SELECT 
  id,
  email,
  name,
  role,
  created_at
FROM public.profiles 
WHERE email = 'admin@runbrasil.com.br';

-- 3. Verificar se os IDs estão vinculados
SELECT 
  u.id as auth_id,
  u.email,
  p.id as profile_id,
  p.name,
  p.role,
  CASE 
    WHEN u.id = p.id THEN '✅ VINCULADO'
    ELSE '❌ NÃO VINCULADO'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'admin@runbrasil.com.br';
