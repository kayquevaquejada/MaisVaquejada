import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

// URL to FCM API
// Nota: Usando a API legada por simplicidade, caso contrário precisa autenticação JWT para API v1.
const FCM_URL = 'https://fcm.googleapis.com/fcm/send'

serve(async (req) => {
  try {
    // 1. Instanciar Supabase Admin Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // A chave do Firebase armazenada como Secret no Supabase
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')
    if (!fcmServerKey) {
      console.warn("FCM_SERVER_KEY is not set.")
      return new Response(JSON.stringify({ error: "FCM_SERVER_KEY is not configured" }), { status: 500 })
    }

    // 2. Receber o payload do Webhook (INSERT on notifications table)
    const payload = await req.json()
    console.log("Webhook payload received:", payload)

    const record = payload.record
    if (!record) {
      return new Response(JSON.stringify({ error: "No record found" }), { status: 400 })
    }

    const { user_id, title, message, type } = record

    if (!user_id) {
      return new Response(JSON.stringify({ error: "No user_id found in record" }), { status: 400 })
    }

    // 3. Buscar os tokens de push ativos para este usuário
    const { data: pushTokens, error: tokenError } = await supabaseClient
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', user_id)
      .eq('is_active', true)

    if (tokenError || !pushTokens || pushTokens.length === 0) {
      console.log(`No active tokens found for user: ${user_id}`)
      return new Response(JSON.stringify({ message: "No active tokens for user" }), { status: 200 })
    }

    // Extrair array de strings com os tokens
    const tokens = pushTokens.map(t => t.token)

    // 4. Montar o payload para o Firebase Cloud Messaging
    const fcmPayload = {
      registration_ids: tokens,
      notification: {
        title: title || 'Nova Interação',
        body: message || 'Você tem uma nova notificação',
        sound: 'default'
      },
      data: {
        type: type || 'general',
        click_action: 'FLUTTER_NOTIFICATION_CLICK' // Ajuste conforme necessário para o Capacitor
      }
    }

    console.log("Sending to FCM:", fcmPayload)

    // 5. Disparar o POST para FCM
    const fcmResponse = await fetch(FCM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${fcmServerKey}`
      },
      body: JSON.stringify(fcmPayload)
    })

    const fcmResult = await fcmResponse.json()
    console.log("FCM Result:", fcmResult)

    return new Response(JSON.stringify({ success: true, result: fcmResult }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error) {
    console.error("Error processing webhook:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    })
  }
})
