-- Migração para impor regras de validação no nome de usuário (@apelido)
-- 1. Mínimo de 6 caracteres
-- 2. Apenas letras minúsculas, números, ponto (.) e underline (_)

-- Primeiro, limpamos espaços em branco (se houver)
UPDATE public.profiles SET username = LOWER(TRIM(username)) WHERE username IS NOT NULL;

-- Adiciona a restrição de comprimento mínimo
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS username_length_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT username_length_check CHECK (char_length(username) >= 6);

-- Adiciona a restrição de formato (regex)
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS username_format_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT username_format_check CHECK (username ~ '^[a-z0-9._]+$');

-- Comentário para documentação
COMMENT ON COLUMN public.profiles.username IS 'Nome de usuário único, min 6 caracteres, letras minúsculas, números, ponto e underline.';
