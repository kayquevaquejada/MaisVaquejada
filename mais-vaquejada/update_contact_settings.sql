-- Adicionar configurações de contato da Arena
INSERT INTO public.app_settings (key, value, category)
VALUES 
('contact_info', '{"whatsapp": "5583999999999", "instagram": "arenadigital", "email": "contato@arenadigital.com"}', 'support')
ON CONFLICT (key) DO NOTHING;
