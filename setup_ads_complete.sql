-- ================================================================
-- SETUP COMPLETO: Tabela ads_campaigns + RLS Policies
-- Cole TODO este bloco no Supabase SQL Editor e clique RUN
-- Dashboard → SQL Editor → New Query → Cole → Run ▶
-- ================================================================

-- ============================================================
-- PASSO 1: Criar a tabela ads_campaigns (se não existir)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ads_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internal_name TEXT NOT NULL,
    ad_type TEXT DEFAULT 'carrossel_top',
    title TEXT,
    subtitle TEXT,
    cta_text TEXT DEFAULT 'VER MAIS',
    action_type TEXT DEFAULT 'external_link',
    action_value TEXT,
    image_url TEXT,
    target_screen TEXT[] DEFAULT '{}',
    target_position TEXT DEFAULT 'market_top_carousel',
    duration_seconds INTEGER DEFAULT 5,
    priority INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PASSO 2: Criar tabelas de métricas (se não existirem)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ad_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID REFERENCES public.ads_campaigns(id) ON DELETE CASCADE,
    screen_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ad_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID REFERENCES public.ads_campaigns(id) ON DELETE CASCADE,
    screen_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PASSO 3: Ativar RLS nas tabelas
-- ============================================================
ALTER TABLE public.ads_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PASSO 4: Remover políticas antigas (evita conflito)
-- ============================================================
DROP POLICY IF EXISTS "Public can read active ads" ON public.ads_campaigns;
DROP POLICY IF EXISTS "Authenticated users can read all ads" ON public.ads_campaigns;
DROP POLICY IF EXISTS "Authenticated users can create ads" ON public.ads_campaigns;
DROP POLICY IF EXISTS "Authenticated users can update ads" ON public.ads_campaigns;
DROP POLICY IF EXISTS "Authenticated users can delete ads" ON public.ads_campaigns;
DROP POLICY IF EXISTS "Anyone can insert impressions" ON public.ad_impressions;
DROP POLICY IF EXISTS "Anyone can read impressions" ON public.ad_impressions;
DROP POLICY IF EXISTS "Anyone can insert clicks" ON public.ad_clicks;
DROP POLICY IF EXISTS "Anyone can read clicks" ON public.ad_clicks;

-- ============================================================
-- PASSO 5: Criar políticas para ads_campaigns
-- ============================================================

-- Qualquer pessoa (anon ou auth) pode LER todos os anúncios
-- (necessário para o carrossel público funcionar no celular)
CREATE POLICY "Public can read active ads"
ON public.ads_campaigns FOR SELECT
TO public
USING (true);

-- Usuários autenticados podem CRIAR anúncios
CREATE POLICY "Authenticated users can create ads"
ON public.ads_campaigns FOR INSERT
TO authenticated
WITH CHECK (true);

-- Usuários autenticados podem ATUALIZAR anúncios
CREATE POLICY "Authenticated users can update ads"
ON public.ads_campaigns FOR UPDATE
TO authenticated
USING (true);

-- Usuários autenticados podem DELETAR anúncios
CREATE POLICY "Authenticated users can delete ads"
ON public.ads_campaigns FOR DELETE
TO authenticated
USING (true);

-- ============================================================
-- PASSO 6: Políticas para métricas
-- ============================================================
CREATE POLICY "Anyone can insert impressions"
ON public.ad_impressions FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can read impressions"
ON public.ad_impressions FOR SELECT
TO public
USING (true);

CREATE POLICY "Anyone can insert clicks"
ON public.ad_clicks FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can read clicks"
ON public.ad_clicks FOR SELECT
TO public
USING (true);

-- ============================================================
-- PASSO 7: Storage Bucket - remover políticas antigas
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can upload to vaquejadas" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update files in vaquejadas" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to vaquejadas" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete files in vaquejadas" ON storage.objects;

-- ============================================================
-- PASSO 8: Storage Bucket - criar políticas novas
-- ============================================================

-- Qualquer um pode VER imagens (carrossel público)
CREATE POLICY "Public read access to vaquejadas"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vaquejadas');

-- Usuários autenticados podem FAZER UPLOAD
CREATE POLICY "Authenticated users can upload to vaquejadas"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vaquejadas');

-- Usuários autenticados podem SUBSTITUIR imagens (upsert)
CREATE POLICY "Authenticated users can update files in vaquejadas"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vaquejadas');

-- Usuários autenticados podem DELETAR imagens
CREATE POLICY "Authenticated users can delete files in vaquejadas"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vaquejadas');

-- ============================================================
-- PASSO 9: Garantir que o bucket 'vaquejadas' é público
-- ============================================================
UPDATE storage.buckets
SET public = true
WHERE id = 'vaquejadas';

-- ============================================================
-- FIM - Se tudo correu bem, você verá "Success" no Supabase
-- ============================================================
