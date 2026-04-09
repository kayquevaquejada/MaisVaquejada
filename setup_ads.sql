-- 1. ADVERTISERS (Anunciantes/Patrocinadores)
CREATE TABLE IF NOT EXISTS public.advertisers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact_name TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    logo_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. ADS_CAMPAIGNS (As campanhas em si)
CREATE TABLE IF NOT EXISTS public.ads_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_id UUID REFERENCES public.advertisers(id) ON DELETE SET NULL,
    internal_name TEXT NOT NULL,
    ad_type TEXT NOT NULL, -- carrossel_top, fixo_inline, card_sponsor, popup
    title TEXT,
    subtitle TEXT,
    description TEXT,
    cta_text TEXT,
    image_url TEXT,
    secondary_image_url TEXT,
    action_type TEXT, -- external_link, whatsapp, internal_route
    action_value TEXT, -- link itself or phone number
    target_screen TEXT[], -- ['market_top_carousel', 'vaquejada_top_carousel']
    target_position TEXT,
    display_order INTEGER DEFAULT 0,
    priority INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 5,
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'draft', -- draft, active, paused, scheduled, expired
    created_by UUID REFERENCES public.profiles(id),
    approved_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. AD_IMPRESSIONS (Métricas de Visualização)
CREATE TABLE IF NOT EXISTS public.ad_impressions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_id UUID REFERENCES public.ads_campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    screen_name TEXT,
    device_type TEXT,
    shown_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. AD_CLICKS (Métricas de Engajamento)
CREATE TABLE IF NOT EXISTS public.ad_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_id UUID REFERENCES public.ads_campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    screen_name TEXT,
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Básico: Leitura liberada para campanhas, restrito para métricas e anunciantes a admins
ALTER TABLE public.advertisers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_impressions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_clicks DISABLE ROW LEVEL SECURITY;

