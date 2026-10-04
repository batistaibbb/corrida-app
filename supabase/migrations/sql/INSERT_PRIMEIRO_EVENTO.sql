-- ============================================
-- INSERIR PRIMEIRO EVENTO OFICIAL
-- 1ª Corrida e Caminhada "Mulheres em Movimento"
-- ============================================
-- Execute este SQL no Supabase SQL Editor

INSERT INTO races (
  id,
  name,
  date,
  time,
  location,
  city,
  state,
  image_url,
  description,
  organizer_name,
  max_participants,
  category,
  sport,
  published,
  registration_status,
  distances,
  includes,
  rules,
  featured,
  discount,
  tags,
  participants_count
) VALUES (
  gen_random_uuid(),
  '1ª Corrida e Caminhada "Mulheres em Movimento"',
  '2026-10-31',
  '07:00',
  'Ciclovia/Automóvel Clube - Saída Bosque de Nova Campinas',
  'Campinas',
  'SP',
  'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&h=400&fit=crop',
  'Mulher, venha cuidar do corpo, fortalecer a fé e celebrar a vida! A nossa saúde é preciosa e o nosso corpo é templo do Espírito Santo (1 Coríntios 6:19). Por isso, convidamos você para a nossa manhã esportiva em prol da conscientização do Outubro Rosa. Vamos nos mover juntas pela vida e pela saúde! Chame uma amiga, sua mãe, suas irmãs na fé e venha participar conosco! Você não pode ficar de fora dessa.',
  'Igreja - Mulheres em Movimento',
  500,
  'Corrida e Caminhada',
  'corrida_caminhada',
  true,
  'upcoming',
  '[
    {"km": 0, "price": 35.00, "name": "Kit 3 - Medalha + Viseira"},
    {"km": 0, "price": 50.00, "name": "Kit 2 - Medalha + Camisa"},
    {"km": 4, "price": 70.00, "name": "Kit 1 - Medalha + Camisa + Viseira (Corrida 4km)"},
    {"km": 0, "price": 70.00, "name": "Kit 1 - Medalha + Camisa + Viseira (Caminhada)"}
  ]'::jsonb,
  '[
    "Medalha de participação",
    "Camisa exclusiva do evento",
    "Viseira personalizada",
    "Hidratação durante o percurso",
    "Apoio médico",
    "Sorteio de brindes"
  ]'::jsonb,
  '[
    "Evento aberto para todas as idades",
    "Caminhada: para todas as idades e níveis",
    "Corrida 4km: recomendado para quem já pratica atividade física",
    "Menores de 18 anos devem estar acompanhados de um responsável",
    "Chegar com 30 minutos de antecedência para retirada do kit",
    "Trajes esportivos recomendados",
    "Levar garrafa de água pessoal"
  ]'::jsonb,
  true,
  0,
  '["outubro-rosa", "mulheres", "corrida", "caminhada", "saúde", "fé", "campinas"]'::jsonb,
  0
);

-- Verificar se foi inserido
SELECT 
  id,
  name,
  date,
  time,
  city,
  state,
  published,
  registration_status,
  featured,
  participants_count,
  max_participants,
  created_at
FROM races
WHERE name LIKE '%Mulheres em Movimento%'
ORDER BY created_at DESC;

-- Mostrar detalhes completos
SELECT 
  name,
  description,
  organizer_name,
  distances::jsonb,
  includes::jsonb,
  rules::jsonb,
  tags::jsonb
FROM races
WHERE name LIKE '%Mulheres em Movimento%';
