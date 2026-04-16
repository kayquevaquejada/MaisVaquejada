-- Tabela para armazenar os aceites legais dos usuários
CREATE TABLE IF NOT EXISTS public.user_legal_acceptances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    accepted_terms BOOLEAN NOT NULL DEFAULT FALSE,
    accepted_privacy BOOLEAN NOT NULL DEFAULT FALSE,
    terms_version TEXT NOT NULL,
    privacy_version TEXT NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    accepted_ip TEXT,
    accepted_user_agent TEXT,
    accepted_method TEXT, -- e.g., 'google_first_login', 'forced_reacceptance'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.user_legal_acceptances ENABLE ROW LEVEL SECURITY;

-- Índice para busca rápida por usuário
CREATE INDEX IF NOT EXISTS idx_user_legal_acceptances_user ON public.user_legal_acceptances(user_id);

-- Política: Usuário pode ver seu próprio histórico de aceites
CREATE POLICY "Usuários podem ver seus próprios aceites" 
ON public.user_legal_acceptances FOR SELECT 
USING (auth.uid() = user_id);

-- Política: Usuário pode inserir seu próprio aceite
CREATE POLICY "Usuários podem registrar seus aceites" 
ON public.user_legal_acceptances FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Adicionar campo no perfil para cache do status legal (opcional, para performance)
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS legal_acceptance_completed BOOLEAN DEFAULT FALSE;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_legal_accepted_at TIMESTAMP WITH TIME ZONE;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_terms_version TEXT;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_privacy_version TEXT;
