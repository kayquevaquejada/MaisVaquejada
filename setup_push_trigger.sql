-- Ativar a extensão pg_net se não estiver ativa
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar a função que chama a Edge Function
CREATE OR REPLACE FUNCTION public.notify_push_edge_function()
RETURNS TRIGGER AS $$
DECLARE
  v_url text := 'https://oisrjnhsrhnhwhcmyutq.supabase.co/functions/v1/push-notification';
  v_body jsonb;
  v_req_id bigint;
BEGIN
  -- Montar o corpo com o registro recém-inserido
  v_body := jsonb_build_object(
    'type', 'INSERT',
    'table', 'notifications',
    'record', row_to_json(NEW)
  );

  -- Realizar a requisição HTTP POST de forma assíncrona usando pg_net
  SELECT net.http_post(
      url := v_url,
      body := v_body,
      headers := '{"Content-Type": "application/json"}'::jsonb
  ) INTO v_req_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar o gatilho na tabela notifications
DROP TRIGGER IF EXISTS on_notification_insert_send_push ON public.notifications;
CREATE TRIGGER on_notification_insert_send_push
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.notify_push_edge_function();
