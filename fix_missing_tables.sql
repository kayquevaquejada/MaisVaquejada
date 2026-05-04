CREATE TABLE IF NOT EXISTS public.app_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Basic RLS for public read
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read app_config" ON public.app_config FOR SELECT USING (true);
CREATE POLICY "Public read app_settings" ON public.app_settings FOR SELECT USING (true);

-- Insert dummy data to stop 404/Empty errors if app expects it
INSERT INTO public.app_config (key, value) VALUES ('general', '{"maintenance": false}') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.app_settings (key, value) VALUES ('theme', 'dark') ON CONFLICT (key) DO NOTHING;
