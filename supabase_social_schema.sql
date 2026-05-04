
-- -----------------------------------------------------------------------------
-- 0. TABELA DE PERFIS (PROFILE)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    whatsapp TEXT,
    avatar_url TEXT,
    bio TEXT,
    state_id TEXT,
    city_id TEXT,
    role TEXT DEFAULT 'USER',
    can_add_event BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 1. TABELAS DE CONTEÚDO (POSTS E STORIES)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT DEFAULT 'image',
    caption TEXT,
    location TEXT,
    event_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT DEFAULT 'image',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 2. ENGAJAMENTO E SOCIAL
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, 
    actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, 
    type TEXT NOT NULL, 
    reference_id UUID, 
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 3. SEGURANÇA (RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas PROFILES: O usuário pode ler qualquer perfil, mas só editar o seu.
CREATE POLICY "Qualquer um vê perfis" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Usuário gerencia próprio perfil" ON public.profiles FOR ALL USING (auth.uid() = id);

-- Políticas POSTS: Todos veem, só o dono cria/edita.
CREATE POLICY "Todos podem ver posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Dono pode gerenciar proprio post" ON public.posts FOR ALL USING (auth.uid() = user_id);

-- Políticas STORIES
CREATE POLICY "Todos podem ver stories" ON public.stories FOR SELECT USING (true);
CREATE POLICY "Dono pode gerenciar story" ON public.stories FOR ALL USING (auth.uid() = user_id);

-- Políticas FOLLOWS
CREATE POLICY "Public follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Gerenciar próprios follows" ON public.follows FOR ALL USING (auth.uid() = follower_id);

-- Políticas COMENTÁRIOS E NOTIFICAÇÕES
CREATE POLICY "Comentarios sao publicos" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Podem comentar" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Ver proprias notificacoes" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Atores inserem notificacoes" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = actor_id);

-- Políticas DMs
CREATE POLICY "Acesso DMs privadas" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Enviar DMs" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
