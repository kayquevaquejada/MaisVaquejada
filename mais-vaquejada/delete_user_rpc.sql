-- Função para permitir que um ADMIN_MASTER delete usuários
-- Esta função precisa ser executada no SQL Editor do Supabase

CREATE OR REPLACE FUNCTION public.delete_user_admin(target_user_id UUID)
RETURNS void AS $$
DECLARE
    requester_role TEXT;
BEGIN
    -- Busca o cargo de quem está tentando deletar
    SELECT role INTO requester_role FROM public.profiles WHERE id = auth.uid();

    -- Verifica se é ADMIN_MASTER
    IF requester_role = 'ADMIN_MASTER' THEN
        -- Deleta o usuário da tabela de autenticação (o que causará cascade para o perfil e tudo mais)
        DELETE FROM auth.users WHERE id = target_user_id;
    ELSE
        RAISE EXCEPTION 'Permissão negada. Apenas ADMIN_MASTER pode deletar usuários.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário de segurança
COMMENT ON FUNCTION public.delete_user_admin IS 'Permite exclusão de usuários da base AUTH e PUBLIC por um Admin Master.';
