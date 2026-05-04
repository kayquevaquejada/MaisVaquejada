-- Backend tables for Admin Events & News
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  location text,
  park text,
  price text,
  category text,
  date_month text,
  date_day text,
  image_url text,
  site text,
  instagram text,
  phone text,
  prizes text,
  description text,
  is_highlight boolean DEFAULT false,
  is_paused boolean DEFAULT false,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- RLS policies for events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Events are viewable by everyone" ON public.events FOR SELECT USING (true);
CREATE POLICY "Admins can insert events" ON public.events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'ADMIN_MASTER' OR role = 'ADMIN' OR admin_eventos = true))
);
CREATE POLICY "Admins can update events" ON public.events FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'ADMIN_MASTER' OR role = 'ADMIN' OR admin_eventos = true))
);
CREATE POLICY "Admins can delete events" ON public.events FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'ADMIN_MASTER' OR role = 'ADMIN' OR admin_eventos = true))
);

CREATE TABLE IF NOT EXISTS public.news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tag text NOT NULL,
  title text NOT NULL,
  description text,
  date text NOT NULL,
  type text DEFAULT 'info',
  is_paused boolean DEFAULT false,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- RLS policies for news
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public News are viewable by everyone" ON public.news FOR SELECT USING (true);
CREATE POLICY "Admins can insert news" ON public.news FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'ADMIN_MASTER' OR role = 'ADMIN' OR admin_noticias = true))
);
CREATE POLICY "Admins can update news" ON public.news FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'ADMIN_MASTER' OR role = 'ADMIN' OR admin_noticias = true))
);
CREATE POLICY "Admins can delete news" ON public.news FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'ADMIN_MASTER' OR role = 'ADMIN' OR admin_noticias = true))
);
