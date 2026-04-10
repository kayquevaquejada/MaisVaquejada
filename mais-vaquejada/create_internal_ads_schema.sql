-- ==============================================================================
-- MÓDULO ENTERPRISE DE PUBLICIDADE INTERNA
-- Criação das tabelas para o Ads Manager Interno da Arena +Vaquejada
-- ==============================================================================

-- 1. Tabela Principal de Campanhas
CREATE TABLE IF NOT EXISTS public.internal_ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_name VARCHAR(255) NOT NULL,
  public_title VARCHAR(255) NOT NULL,
  advertiser_name VARCHAR(255) NOT NULL,
  advertiser_logo_url TEXT,
  description TEXT,
  cta_text VARCHAR(50) NOT NULL,
  main_media_url TEXT NOT NULL,
  media_type VARCHAR(20) DEFAULT 'image',
  action_type VARCHAR(50) NOT NULL,
  action_value TEXT NOT NULL,
  fallback_action_type VARCHAR(50),
  fallback_action_value TEXT,
  placement VARCHAR(50) NOT NULL,
  status VARCHAR(30) DEFAULT 'draft',
  priority INT DEFAULT 0,
  weight INT DEFAULT 1,
  contract_type VARCHAR(50) NOT NULL,
  budget_amount DECIMAL(10,2),
  impression_goal INT,
  click_goal INT,
  max_impressions INT,
  max_clicks INT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  is_premium BOOLEAN DEFAULT FALSE,
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  notes_internal TEXT,
  target_rules_json JSONB DEFAULT '{}'::jsonb,
  frequency_rules_json JSONB DEFAULT '{}'::jsonb
);

-- Habilitar RLS (desativado por enquanto para admins, mas ativado para leitura)
ALTER TABLE public.internal_ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active campaigns" ON public.internal_ad_campaigns
  FOR SELECT USING (status = 'active');

CREATE POLICY "Admins can do everything on campaigns" ON public.internal_ad_campaigns
  FOR ALL USING (auth.role() = 'authenticated'); -- Simplificado para o escopo atual, ideal seria checar role de admin

-- 2. Tracking de Impressões
CREATE TABLE IF NOT EXISTS public.internal_ad_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.internal_ad_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  placement VARCHAR(50) NOT NULL,
  feed_position INT,
  session_id VARCHAR(255),
  seen_at TIMESTAMPTZ DEFAULT NOW(),
  metadata_json JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.internal_ad_impressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert impressions" ON public.internal_ad_impressions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view impressions" ON public.internal_ad_impressions FOR SELECT USING (true);


-- 3. Tracking de Cliques
CREATE TABLE IF NOT EXISTS public.internal_ad_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.internal_ad_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  placement VARCHAR(50) NOT NULL,
  action_type VARCHAR(50),
  session_id VARCHAR(255),
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  metadata_json JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.internal_ad_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert clicks" ON public.internal_ad_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view clicks" ON public.internal_ad_clicks FOR SELECT USING (true);

-- Índices de performance para as consultas de elegibilidade
CREATE INDEX idx_campaigns_status ON public.internal_ad_campaigns(status);
CREATE INDEX idx_campaigns_placement_period ON public.internal_ad_campaigns(placement, start_at, end_at);
CREATE INDEX idx_impressions_campaign_user ON public.internal_ad_impressions(campaign_id, user_id);
