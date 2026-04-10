-- ============================================================
-- FIX NOTIFICATIONS - Arena +Vaquejada
-- Garante que a tabela tenha todas as colunas e políticas corretas
-- ============================================================

-- 1. Garantir colunas message e metadata (usadas em comentários e menções)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='message') THEN
        ALTER TABLE public.notifications ADD COLUMN message TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='metadata') THEN
        ALTER TABLE public.notifications ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. Garantir que reference_id seja opcional e possa ser nulo (para follows)
ALTER TABLE public.notifications ALTER COLUMN reference_id DROP NOT NULL;

-- 3. Atualizar Políticas de Segurança (RLS)
-- Permitir que o usuário atualize suas próprias notificações (marcar como lido)
DROP POLICY IF EXISTS "Atualizar proprias notificacoes" ON public.notifications;
CREATE POLICY "Atualizar proprias notificacoes" ON public.notifications 
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Permitir que qualquer usuário autenticado insira notificações para OUTROS (atores)
-- A política anterior estava "auth.uid() = actor_id", o que é correto mas às vezes
-- causa falha se o actor_id for passado manualmente e não bater com o auth.uid() exato.
DROP POLICY IF EXISTS "Atores inserem notificacoes" ON public.notifications;
CREATE POLICY "Atores inserem notificacoes" ON public.notifications 
    FOR INSERT 
    WITH CHECK (auth.uid() = actor_id);

-- Garantir que Realtime está ativado para esta tabela
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Notificar recarga de schema
NOTIFY pgrst, 'reload schema';
