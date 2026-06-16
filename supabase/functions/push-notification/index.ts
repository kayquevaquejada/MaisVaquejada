import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

// Helper to base64url encode a string or Uint8Array
function base64UrlEncode(str: string | Uint8Array): string {
  let binary = "";
  const bytes = typeof str === "string" ? new TextEncoder().encode(str) : str;
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// Helper to generate Google OAuth2 Access Token for FCM V1 using Deno's Web Crypto
async function getAccessToken(serviceAccount: any): Promise<string> {
  const { client_email, private_key } = serviceAccount;
  
  if (!client_email || !private_key) {
    throw new Error("Invalid service account JSON: missing client_email or private_key");
  }

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;
  const payload = {
    iss: client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat,
    exp,
  };

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerEncoded}.${payloadEncoded}`;

  // Clean PEM private key
  const pem = private_key
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");

  // Decode Base64 PEM to ArrayBuffer
  const binaryString = atob(pem);
  const derBuffer = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    derBuffer[i] = binaryString.charCodeAt(i);
  }

  // Import the private key
  const key = await crypto.subtle.importKey(
    "pkcs8",
    derBuffer.buffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  // Sign the JWT input
  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput)
  );

  const signatureEncoded = base64UrlEncode(new Uint8Array(signatureBuffer));
  const jwt = `${signingInput}.${signatureEncoded}`;

  // Exchange JWT for OAuth2 Access Token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text();
    throw new Error(`Failed to exchange JWT for token: ${errText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

serve(async (req) => {
  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Instanciar supabaseClient fora para uso no catch se necessário
  let supabaseClient;
  try {
    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    const record = payload.record || payload // Lida tanto com gatilhos do banco quanto chamadas diretas
    
    if (!record) {
      return new Response(JSON.stringify({ error: "No record found" }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      })
    }

    const { user_id, actor_id, type, message, reference_id } = record

    if (!user_id) {
      return new Response(JSON.stringify({ error: "No user_id found in record" }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      })
    }

    // 1. Verificar preferências de Notificações Push do destinatário
    const { data: preferences } = await supabaseClient
      .from('push_preferences')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle()

    // Determina se a notificação está ativa baseado no tipo
    let isPrefEnabled = true
    if (preferences) {
      if (type === 'live' && !preferences.lives) isPrefEnabled = false
      else if (type === 'news' && !preferences.news) isPrefEnabled = false
      else if (['like', 'comment', 'follow', 'mention'].includes(type) && !preferences.social) isPrefEnabled = false
      else if (type === 'message' && !preferences.messages) isPrefEnabled = false
      else if (type === 'campaign' && !preferences.campaigns) isPrefEnabled = false
    }

    if (!isPrefEnabled) {
      console.log(`Push notification of type '${type}' disabled by user preferences for: ${user_id}`)
      return new Response(JSON.stringify({ message: "Notification type disabled by user preference" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      })
    }

    // 2. Buscar informações de perfil do ator (quem gerou a ação) para personalização
    let actorName = 'Alguém'
    let actorUsername = ''
    if (actor_id) {
      try {
        const { data: actorProfile } = await supabaseClient
          .from('profiles')
          .select('name, full_name, username')
          .eq('id', actor_id)
          .maybeSingle()
        
        if (actorProfile) {
          actorName = actorProfile.full_name || actorProfile.name || 'Vaqueiro'
          actorUsername = actorProfile.username || ''
        }
      } catch (err) {
        console.warn('Error fetching actor profile details:', err)
      }
    }

    // 3. Formatar título e corpo dinâmicos da notificação
    let titleToSend = '+Vaquejada'
    let bodyToSend = 'Você tem uma nova notificação'

    const actorDisplay = actorUsername ? `@${actorUsername}` : actorName

    switch (type) {
      case 'follow':
        titleToSend = 'Novo Seguidor'
        bodyToSend = `${actorDisplay} começou a seguir você.`
        break;
      case 'like':
        titleToSend = 'Curtida'
        bodyToSend = `${actorDisplay} curtiu sua publicação.`
        break;
      case 'comment':
        titleToSend = 'Novo Comentário'
        bodyToSend = message 
          ? `${actorDisplay} comentou: "${message}"` 
          : `${actorDisplay} comentou em sua publicação.`
        break;
      case 'message':
        titleToSend = 'Mensagem Recebida'
        bodyToSend = message 
          ? `${actorDisplay}: ${message}` 
          : `${actorDisplay} te enviou uma mensagem.`
        break;
      case 'mention':
        titleToSend = 'Mencionou você'
        bodyToSend = `${actorDisplay} mencionou você em um comentário.`
        break;
      case 'auction_bid':
        titleToSend = 'Novo Lance'
        bodyToSend = message || `${actorDisplay} deu um lance em seu animal.`
        break;
      case 'outbid':
        titleToSend = 'Lance Superado'
        bodyToSend = message || `Você foi superado em um leilão!`
        break;
      case 'system':
        titleToSend = 'Alerta do Sistema'
        bodyToSend = message || 'O +Vaquejada enviou um alerta sobre sua conta.'
        break;
      default:
        titleToSend = '+Vaquejada'
        bodyToSend = message || `${actorDisplay} interagiu com você.`
        break;
    }

    // 4. Buscar tokens de push ativos deste usuário
    const { data: pushTokens, error: tokenError } = await supabaseClient
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', user_id)
      .eq('is_active', true)

    if (tokenError || !pushTokens || pushTokens.length === 0) {
      console.log(`No active tokens found for user: ${user_id}`)
      return new Response(JSON.stringify({ message: "No active tokens for user" }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      })
    }

    const tokens = pushTokens.map(t => t.token)

    // Definir as rotas nativas de clique (Deeplink)
    const dataPayload: Record<string, string> = {
      type: type || 'general',
      click_action: 'FLUTTER_NOTIFICATION_CLICK'
    }

    if (type === 'follow' && actorUsername) {
      dataPayload.route = `/perfil/${actorUsername}`
    } else if (type === 'follow' && actor_id) {
      dataPayload.route = `/perfil/${actor_id}`
    } else if (['like', 'comment', 'mention'].includes(type)) {
      dataPayload.route = '/arena'
    } else if (type === 'news' || type === 'live') {
      dataPayload.route = '/noticias'
    }

    // 5. Enviar usando FCM v1 ou fallback legada
    const fcmServiceAccountStr = Deno.env.get('FCM_SERVICE_ACCOUNT')
    let results: any[] = []
    let successCount = 0
    let failureCount = 0

    if (fcmServiceAccountStr) {
      console.log("Using FCM v1 flow")
      const serviceAccount = JSON.parse(fcmServiceAccountStr)
      const projectId = serviceAccount.project_id
      const accessToken = await getAccessToken(serviceAccount)
      const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`

      const sendPromises = tokens.map(async (token) => {
        const fcmPayload = {
          message: {
            token: token,
            notification: {
              title: titleToSend,
              body: bodyToSend
            },
            data: dataPayload,
            android: {
              notification: {
                channel_id: 'maisvaquejada_notifications',
                sound: 'default'
              }
            },
            apns: {
              payload: {
                aps: {
                  sound: 'default'
                }
              }
            }
          }
        }

        try {
          const response = await fetch(fcmUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(fcmPayload)
          })

          const resJson = await response.json()
          if (response.ok) {
            successCount++
            return { token, success: true, result: resJson }
          } else {
            failureCount++
            
            // Auto desativar tokens expirados/inválidos
            const isInvalidToken = resJson.error?.status === 'UNREGISTERED' || 
                                  resJson.error?.message?.includes('not registered') ||
                                  resJson.error?.code === 404
            
            if (isInvalidToken) {
              await supabaseClient
                .from('push_tokens')
                .update({ is_active: false })
                .eq('token', token)
            }

            return { token, success: false, error: resJson }
          }
        } catch (err: any) {
          failureCount++
          return { token, success: false, error: err.message }
        }
      })

      results = await Promise.all(sendPromises)
    } else {
      console.warn("FCM_SERVICE_ACCOUNT is not configured. Falling back to legacy API.")
      const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')
      if (!fcmServerKey) {
        throw new Error("Neither FCM_SERVICE_ACCOUNT nor FCM_SERVER_KEY is configured.")
      }

      const legacyFcmUrl = 'https://fcm.googleapis.com/fcm/send'
      const legacyPayload = {
        registration_ids: tokens,
        priority: 'high',
        content_available: true,
        notification: {
          title: titleToSend,
          body: bodyToSend,
          sound: 'default',
          android_channel_id: 'maisvaquejada_notifications'
        },
        data: dataPayload
      }

      const response = await fetch(legacyFcmUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${fcmServerKey}`
        },
        body: JSON.stringify(legacyPayload)
      })

      const resJson = await response.json()
      results = [resJson]
      successCount = resJson.success || 0
      failureCount = resJson.failure || 0
    }

    // 6. Gravar log na tabela push_logs
    try {
      await supabaseClient.from('push_logs').insert({
        user_id: user_id,
        type: type || 'general',
        status: successCount > 0 ? 'sent' : (failureCount > 0 ? 'failed' : 'ignored'),
        payload: {
          title: titleToSend,
          body: bodyToSend,
          recipient_tokens: tokens,
          results: results
        }
      })
    } catch (logErr) {
      console.warn('Failed to log push attempt to push_logs:', logErr)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      sent_count: successCount, 
      failed_count: failureCount,
      results: results 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error: any) {
    console.error("Error processing push notification request:", error)
    
    // Gravar log de falha crítica se possível
    try {
      if (supabaseClient) {
        const payload = await req.clone().json().catch(() => ({}))
        const record = payload.record || payload
        if (record?.user_id) {
          await supabaseClient.from('push_logs').insert({
            user_id: record.user_id,
            type: record.type || 'general',
            status: 'failed',
            error_message: error.message,
            payload: { error: error.stack }
          })
        }
      }
    } catch {}

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
