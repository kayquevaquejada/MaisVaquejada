
-- Tabela de chamadas para sinalização WebRTC
CREATE TABLE IF NOT EXISTS public.calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id TEXT NOT NULL,
    from_user UUID NOT NULL REFERENCES auth.users(id),
    participants UUID[] NOT NULL, -- Suporta chamadas em grupo
    type TEXT NOT NULL CHECK (type IN ('offer', 'answer', 'ice', 'ringing', 'accepted', 'rejected', 'end')),
    sdp TEXT,
    candidate JSONB,
    status TEXT NOT NULL DEFAULT 'calling' CHECK (status IN ('calling', 'ringing', 'connected', 'ended', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas de RLS
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias chamadas"
ON public.calls FOR SELECT
USING (
    auth.uid() = from_user 
    OR auth.uid() = ANY(participants)
);

CREATE POLICY "Usuários podem inserir chamadas"
ON public.calls FOR INSERT
WITH CHECK (auth.uid() = from_user);

CREATE POLICY "Usuários podem atualizar suas chamadas"
ON public.calls FOR UPDATE
USING (
    auth.uid() = from_user 
    OR auth.uid() = ANY(participants)
);

-- Habilitar Realtime para a tabela calls
ALTER PUBLICATION supabase_realtime ADD TABLE calls;
