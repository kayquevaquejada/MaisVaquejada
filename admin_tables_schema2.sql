-- Schema for Mercado (Marketplace)
CREATE TABLE IF NOT EXISTS public.market_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  price text,
  loc text,
  img text,
  is_new boolean DEFAULT false,
  description text,
  category text,
  status text DEFAULT 'pending', -- pending, approved, rejected
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- RLS for market_items
ALTER TABLE public.market_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Market Items" ON public.market_items FOR SELECT USING (status = 'approved');
CREATE POLICY "Users can create market items" ON public.market_items FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins manage market items" ON public.market_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'ADMIN_MASTER' OR role = 'ADMIN' OR admin_mercado = true))
);

-- Schema Additions for Social Moderation
-- Adding an is_hidden flag to posts for moderation without deleting
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='is_hidden') THEN
        ALTER TABLE public.posts ADD COLUMN is_hidden BOOLEAN DEFAULT false;
    END IF;
END $$;
