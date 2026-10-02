-- ============================================
-- RUNBRASIL - SCHEMA SQL PARA SUPABASE
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- Dashboard → SQL Editor → New Query

-- ============================================
-- 1. TABELA DE USUÁRIOS (EXTENDS SUPABASE AUTH)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  cpf TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('admin', 'participant', 'organizer')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 2. TABELA DE EVENTOS (RACES)
-- ============================================
CREATE TABLE public.races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  location TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  image_url TEXT,
  description TEXT,
  organizer_id UUID REFERENCES public.profiles(id),
  organizer_name TEXT,
  participants_count INTEGER DEFAULT 0,
  max_participants INTEGER NOT NULL DEFAULT 1000,
  category TEXT NOT NULL,
  sport TEXT NOT NULL,
  -- Status de publicação (visibilidade)
  published BOOLEAN DEFAULT FALSE,
  -- Status de inscrição (temporal)
  registration_status TEXT NOT NULL DEFAULT 'upcoming' CHECK (registration_status IN ('upcoming', 'closed', 'finished')),
  includes JSONB DEFAULT '[]'::jsonb,
  rules JSONB DEFAULT '[]'::jsonb,
  rating DECIMAL(2,1) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT FALSE,
  discount INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]'::jsonb,
  distances JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;

-- Anyone can view published races
CREATE POLICY "Public can view published races"
  ON public.races FOR SELECT
  USING (published = true);

-- Admins can view all races (including drafts)
CREATE POLICY "Admins can view all races"
  ON public.races FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins and organizers can insert races
CREATE POLICY "Admins and organizers can create races"
  ON public.races FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'organizer')
    )
  );

-- Only admins and organizers can update races
CREATE POLICY "Admins and organizers can update races"
  ON public.races FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'organizer')
    )
  );

-- Only admins can delete races
CREATE POLICY "Admins can delete races"
  ON public.races FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 3. TABELA DE INSCRIÇÕES (REGISTRATIONS)
-- ============================================
CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  race_id UUID NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  distance DECIMAL(5,1) NOT NULL,
  tshirt_size TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'confirmed', 'cancelled', 'transferred')),
  payment_id UUID,
  confirmation_code TEXT UNIQUE NOT NULL,
  emergency_name TEXT NOT NULL,
  emergency_phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Users can view their own registrations
CREATE POLICY "Users can view own registrations"
  ON public.registrations FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all registrations
CREATE POLICY "Admins can view all registrations"
  ON public.registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can create their own registrations
CREATE POLICY "Users can create own registrations"
  ON public.registrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own registrations
CREATE POLICY "Users can update own registrations"
  ON public.registrations FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. TABELA DE PAGAMENTOS (PAYMENTS)
-- ============================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('pix', 'credit_card', 'debit_card')),
  amount DECIMAL(10,2) NOT NULL,
  service_fee DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'refunded')),
  pix_code TEXT,
  pix_qr_code TEXT,
  mercadopago_payment_id TEXT,
  transaction_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.registrations
      WHERE id = payments.registration_id AND user_id = auth.uid()
    )
  );

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can create payments
CREATE POLICY "Users can create payments"
  ON public.payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.registrations
      WHERE id = registration_id AND user_id = auth.uid()
    )
  );

-- ============================================
-- 5. TABELA DE AVALIAÇÕES (REVIEWS)
-- ============================================
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id UUID NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 6. FUNÇÕES E TRIGGERS
-- ============================================

-- Function to update race participants count
CREATE OR REPLACE FUNCTION update_race_participants_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    UPDATE public.races
    SET participants_count = participants_count + 1,
        updated_at = NOW()
    WHERE id = NEW.race_id;
  ELSIF NEW.status != 'confirmed' AND OLD.status = 'confirmed' THEN
    UPDATE public.races
    SET participants_count = GREATEST(0, participants_count - 1),
        updated_at = NOW()
    WHERE id = NEW.race_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_registration_status_change
  AFTER UPDATE OF status ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_race_participants_count();

-- Function to generate confirmation code
CREATE OR REPLACE FUNCTION generate_confirmation_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.confirmation_code := 'RB' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 10));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_registration_create
  BEFORE INSERT ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION generate_confirmation_code();

-- Function to update race rating
CREATE OR REPLACE FUNCTION update_race_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.races
  SET rating = (
    SELECT COALESCE(AVG(rating)::DECIMAL(2,1), 0)
    FROM public.reviews
    WHERE race_id = NEW.race_id
  ),
  reviews_count = (
    SELECT COUNT(*)
    FROM public.reviews
    WHERE race_id = NEW.race_id
  ),
  updated_at = NOW()
  WHERE id = NEW.race_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_review_create
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_race_rating();

-- ============================================
-- 7. INDEXES PARA PERFORMANCE
-- ============================================
CREATE INDEX idx_races_published ON public.races(published);
CREATE INDEX idx_races_registration_status ON public.races(registration_status);
CREATE INDEX idx_races_date ON public.races(date);
CREATE INDEX idx_races_city ON public.races(city);
CREATE INDEX idx_registrations_user_id ON public.registrations(user_id);
CREATE INDEX idx_registrations_race_id ON public.registrations(race_id);
CREATE INDEX idx_registrations_status ON public.registrations(status);
CREATE INDEX idx_payments_registration_id ON public.payments(registration_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_reviews_race_id ON public.reviews(race_id);

-- ============================================
-- 8. STORAGE BUCKETS
-- ============================================
-- Execute via Supabase Dashboard → Storage → New Bucket
-- Bucket name: event-images
-- Public bucket: true
-- Max file size: 5MB
-- Allowed MIME types: image/*

-- ============================================
-- 9. SEED DATA (OPCIONAL)
-- ============================================

-- Create admin user (after creating auth user via Supabase Auth)
-- INSERT INTO public.profiles (id, email, name, role)
-- VALUES ('your-auth-user-id', 'admin@runbrasil.com.br', 'Administrador', 'admin');

-- ============================================
-- FIM DO SCHEMA
-- ============================================
