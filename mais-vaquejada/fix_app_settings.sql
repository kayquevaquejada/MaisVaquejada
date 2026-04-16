-- Criação da tabela de configurações globais do app
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    category TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Segurança de Nível de Linha)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Política: Qualquer um pode ler as configurações
CREATE POLICY "As configurações são públicas para leitura"
ON public.app_settings FOR SELECT
USING (true);

-- Política: Apenas ADMIN_MASTER pode inserir/atualizar
CREATE POLICY "Apenas ADMIN_MASTER pode modificar configurações"
ON public.app_settings FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'ADMIN_MASTER'
    )
);

-- Inserir dados iniciais de contato
INSERT INTO public.app_settings (key, value, category)
VALUES (
    'contact_info', 
    '{"whatsapp": "5583999999999", "instagram": "arenadigital", "email": "contato@arena.com"}', 
    'support'
)
ON CONFLICT (key) DO NOTHING;
