-- Adicionar configurações de monitoramento de armazenamento
INSERT INTO public.app_settings (key, value, category)
VALUES 
('storage_monitoring', '{"used_gb": 4.2, "limit_gb": 100}', 'infra')
ON CONFLICT (key) DO UPDATE SET value = public.app_settings.value || '{"limit_gb": 100}'::jsonb;
