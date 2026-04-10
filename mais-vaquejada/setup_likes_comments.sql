-- ============================================================
-- CURTIDAS E COMENTÁRIOS - Arena +Vaquejada
-- Execute no Supabase SQL Editor do projeto isioislkdfvjgrxwdrhf
-- ============================================================

-- 1. Tabela de Curtidas
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- 2. Tabela de Comentários
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);

-- 4. RLS - Curtidas
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Curtidas visíveis para todos" ON post_likes;
CREATE POLICY "Curtidas visíveis para todos" ON post_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuário pode curtir" ON post_likes;
CREATE POLICY "Usuário pode curtir" ON post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuário pode descurtir" ON post_likes;
CREATE POLICY "Usuário pode descurtir" ON post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- 5. RLS - Comentários  
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comentários visíveis para todos" ON post_comments;
CREATE POLICY "Comentários visíveis para todos" ON post_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuário pode comentar" ON post_comments;
CREATE POLICY "Usuário pode comentar" ON post_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuário pode deletar seu comentário" ON post_comments;
CREATE POLICY "Usuário pode deletar seu comentário" ON post_comments
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Notificar API para reconhecer novas tabelas
NOTIFY pgrst, 'reload schema';
