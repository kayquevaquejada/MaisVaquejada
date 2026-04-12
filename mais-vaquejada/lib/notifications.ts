/**
 * Arena Vaquerama — Sistema de Notificações
 * Gerencia push notifications nativas + notificações Supabase
 */

import { supabase } from './supabase';

export type NotifType = 'follow' | 'like' | 'comment' | 'message' | 'mention' | 'system';


export interface ArenaNotification {
  id: string;
  user_id: string;
  actor_id: string;
  type: NotifType;
  reference_id?: string;
  message?: string;
  is_read: boolean;
  created_at: string;
  metadata?: Record<string, any>;
  // Joined from profiles
  actor_username?: string;
  actor_name?: string;
  actor_avatar?: string;
}

// ─── Solicitar Permissão de Push ────────────────────────────────────────────
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  
  const permission = await Notification.requestPermission();
  console.log('Push notification permission:', permission);
  return permission;
}

// ─── Disparar Notificação Nativa ─────────────────────────────────────────────
export function sendPushNotification(title: string, body: string, icon?: string) {
  // Se estiver no navegador e tiver permissão
  if (('Notification' in window) && Notification.permission === 'granted') {
    try {
      const n = new Notification(title, {
        body,
        icon: icon || '/vite.svg',
        badge: '/vite.svg',
        tag: 'arena-vaquejada',
      });
        // Defer any non-critical initialization if needed
    } catch (e) {
      console.warn('Push notification failed:', e);
    }
  }
}

// ─── Criar Notificação no Supabase ───────────────────────────────────────────
export async function createNotification(params: {
  user_id: string;      // Quem recebe
  actor_id: string;     // Quem gerou
  type: NotifType;
  reference_id?: string;
  message?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  // 1. Salvar no Banco (Supabase)
  const { error } = await supabase.from('notifications').insert({
    user_id: params.user_id,
    actor_id: params.actor_id,
    type: params.type,
    reference_id: params.reference_id || null,
    // Note: If the SQL schema doesn't have message/metadata, this might fail.
    // We should ideally ensure the schema is updated.
  });

  if (error) {
    console.error('Erro ao criar notificação no DB:', error.message);
    return;
  }

  // 2. Tentar disparar push local (apenas se o app estiver aberto no receptor, 
  // mas aqui estamos no lado de quem ENVIA, então o receptor não vai receber via JS 
  // a menos que esteja usando Realtime ou Service Workers).
  // Para fins de demonstração imediata no navegador do próprio usuário (feedback):
  // sendPushNotification('Arena Vaquerama', 'Sua ação foi registrada!');
}

// ─── Buscar Notificações do Usuário ─────────────────────────────────────────
export async function fetchUserNotifications(userId: string): Promise<ArenaNotification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*, profiles:actor_id(username, name, avatar_url)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
       console.warn("Notifications query error:", error);
       return [];
    }

    return (data || []).map((n: any) => ({
      id: n.id,
      user_id: n.user_id,
      actor_id: n.actor_id,
      type: n.type,
      message: n.message,
      reference_id: n.reference_id,
      is_read: n.is_read,
      created_at: n.created_at,
      metadata: n.metadata,
      actor_username: n.profiles?.username || 'vaqueiro',
      actor_name: n.profiles?.name || 'Vaqueiro',
      actor_avatar: n.profiles?.avatar_url
    }));
  } catch (err) {
    console.error("Critical error fetching notifications:", err);
    return [];
  }
}

// ─── Marcar Notificações como Lidas ─────────────────────────────────────────
export async function markNotificationsAsRead(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
}

// ─── Gerar Texto da Notificação ─────────────────────────────────────────────
export function getNotifText(notif: ArenaNotification): string {
  const actor = notif.actor_username || 'Alguém';
  switch (notif.type) {
    case 'follow':  return `${actor} começou a seguir você.`;
    case 'like':    return `${actor} curtiu sua publicação.`;
    case 'comment': return notif.message ? `${actor} comentou: "${notif.message}"` : `${actor} comentou em sua publicação.`;
    case 'message': return notif.message ? `${actor}: ${notif.message}` : `${actor} te enviou uma mensagem.`;
    case 'mention': return `${actor} te mencionou em um comentário.`;
    case 'system':  return notif.message || 'O Vaquerama enviou um alerta sobre sua conta.';
    default:        return `${actor} interagiu com você.`;

  }
}

// ─── Tempo relativo ─────────────────────────────────────────────────────────
export function timeAgo(dateStr: string): string {
  if (!dateStr) return 'Agora';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Agora';
  if (mins < 60) return `Há ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `Há ${days}d`;
}

