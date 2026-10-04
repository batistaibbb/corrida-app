-- ============================================
-- CORRIGIR POLÍTICAS RLS
-- ============================================
-- Execute este SQL se já existir políticas criadas

-- 1. Remover políticas existentes da tabela races
DROP POLICY IF EXISTS "Eventos publicados são visíveis para todos" ON races;
DROP POLICY IF EXISTS "Admins podem ver todos os eventos" ON races;
DROP POLICY IF EXISTS "Admins podem criar eventos" ON races;
DROP POLICY IF EXISTS "Admins podem atualizar eventos" ON races;
DROP POLICY IF EXISTS "Admins podem deletar eventos" ON races;

-- 2. Remover políticas existentes da tabela registrations
DROP POLICY IF EXISTS "Usuários podem ver suas próprias inscrições" ON registrations;
DROP POLICY IF EXISTS "Admins podem ver todas as inscrições" ON registrations;
DROP POLICY IF EXISTS "Usuários podem criar inscrições" ON registrations;
DROP POLICY IF EXISTS "Usuários podem atualizar suas inscrições" ON registrations;

-- 3. Remover políticas existentes da tabela payments
DROP POLICY IF EXISTS "Usuários podem ver seus próprios pagamentos" ON payments;
DROP POLICY IF EXISTS "Admins podem ver todos os pagamentos" ON payments;
DROP POLICY IF EXISTS "Usuários podem criar pagamentos" ON payments;

-- 4. Recriar políticas para races
CREATE POLICY "Eventos publicados são visíveis para todos"
  ON races FOR SELECT
  USING (published = true);

CREATE POLICY "Admins podem ver todos os eventos"
  ON races FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins podem criar eventos"
  ON races FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins podem atualizar eventos"
  ON races FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins podem deletar eventos"
  ON races FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 5. Recriar políticas para registrations
CREATE POLICY "Usuários podem ver suas próprias inscrições"
  ON registrations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins podem ver todas as inscrições"
  ON registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Usuários podem criar inscrições"
  ON registrations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem atualizar suas inscrições"
  ON registrations FOR UPDATE
  USING (user_id = auth.uid());

-- 6. Recriar políticas para payments
CREATE POLICY "Usuários podem ver seus próprios pagamentos"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM registrations 
      WHERE registrations.id = payments.registration_id 
      AND registrations.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins podem ver todos os pagamentos"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Usuários podem criar pagamentos"
  ON payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM registrations 
      WHERE registrations.id = payments.registration_id 
      AND registrations.user_id = auth.uid()
    )
  );

-- 7. Verificar se tudo foi criado corretamente
SELECT 'Políticas RLS recriadas com sucesso!' as status;
