-- Push Notifications Foundation

-- 1. Tabela de Tokens de Dispositivos (FCM / APNs)
CREATE TABLE IF NOT EXISTS public.push_tokens (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    token text NOT NULL,
    platform text NOT NULL, -- 'ios', 'android', 'web'
    device_id text,
    is_active boolean DEFAULT true,
    last_used_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(token, user_id)
);

-- RLS
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tokens"
    ON public.push_tokens
    FOR ALL
    USING (auth.uid() = user_id);

-- 2. Tabela de Preferências de Notificações Push
CREATE TABLE IF NOT EXISTS public.push_preferences (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    news boolean DEFAULT true,
    lives boolean DEFAULT true,
    social boolean DEFAULT true,
    messages boolean DEFAULT true,
    campaigns boolean DEFAULT true,
    system boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- RLS
ALTER TABLE public.push_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own preferences"
    ON public.push_preferences
    FOR ALL
    USING (auth.uid() = user_id);

-- 3. Tabela para Histórico e Logs (Opcional, mas pedido para Fase 6)
CREATE TABLE IF NOT EXISTS public.push_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'news', 'live', 'social', 'system', etc.
    status text NOT NULL, -- 'sent', 'opened', 'failed', 'ignored'
    payload jsonb,
    error_message text,
    created_at timestamp with time zone DEFAULT now()
);

-- RLS
ALTER TABLE public.push_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own logs"
    ON public.push_logs
    FOR SELECT
    USING (auth.uid() = user_id);
