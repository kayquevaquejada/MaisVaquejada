-- Adiciona novas colunas granulares de hierarquia para os sub-admins
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS admin_mercado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_social BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_eventos BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_noticias BOOLEAN DEFAULT false;

-- Política de RLS para que o MASTER_EMAIL possa atualizar essas colunas de qualquer usuario
-- (Assumindo que temos RLS em profiles)
-- Já deve haver política para Admin atualizar profiles, ou podemos atualizar via Backend
