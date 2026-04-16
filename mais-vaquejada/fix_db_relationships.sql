-- 1. Vincular explicitamente à tabela de perfis para permitir o JOIN no Supabase
ALTER TABLE public.user_legal_acceptances 
DROP CONSTRAINT IF EXISTS user_legal_acceptances_user_id_fkey;

ALTER TABLE public.user_legal_acceptances 
ADD CONSTRAINT user_legal_acceptances_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Criar compatibilidade para app_config (que alguns componentes buscam)
CREATE OR REPLACE VIEW public.app_config AS 
SELECT * FROM public.app_settings;

-- 3. Forçar recarregamento do cache do PostgREST
NOTIFY pgrst, 'reload schema';
