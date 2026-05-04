-- Tabela para configurações dinâmicas do App
CREATE TABLE IF NOT EXISTS public.app_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir configuração inicial de versão
INSERT INTO public.app_config (key, value)
VALUES (
    'android_version_control',
    '{
        "latest_version_code": 1,
        "latest_version_name": "1.0.0",
        "min_required_version": 1,
        "apk_url": "https://mais-vaquejada.vercel.app/app/maisvaquejada.apk",
        "force_update": false,
        "title": "Nova Versão Disponível",
        "message": "Atualize seu app para ter acesso às novas funcionalidades e correções de bugs."
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
