/**
 * +Vaquejada — Sistema de Notificações
 * Gerencia push notifications nativas + notificações Supabase
 */

import { supabase } from './supabase';

export type NotifType = 'follow' | 'like' | 'comment' | 'message' | 'mention' | 'system' | 'auction_bid' | 'outbid';


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
  // Metadata for visual feedback
  post_media_url?: string;
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
  actor_id: string | null; // Quem gerou (null para Sistema)
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
    message: params.message || null,
    metadata: params.metadata || {}
  });

  if (error) {
    console.error('Erro ao criar notificação');
    return;
  }
}

// ─── Buscar Notificações do Usuário ─────────────────────────────────────────
export async function fetchUserNotifications(userId: string): Promise<ArenaNotification[]> {
  try {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('notifications')
      .select('*, profiles:actor_id(username, name, avatar_url)')
      .eq('user_id', userId)
      .gte('created_at', fiveDaysAgo)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
       console.warn("Notifications query error:", error);
       return [];
    }

    const notifications = (data || []).map((n: any) => ({
      id: n.id,
      user_id: n.user_id,
      actor_id: n.actor_id,
      type: n.type,
      message: n.message,
      reference_id: n.reference_id,
      is_read: n.is_read,
      created_at: n.created_at,
      metadata: n.metadata,
      actor_username: n.actor_id ? (n.profiles?.username || 'vaqueiro') : '+Vaquejada',
      actor_name: n.actor_id ? (n.profiles?.name || 'Vaqueiro') : '+Vaquejada Oficial',
      actor_avatar: n.profiles?.avatar_url || (n.actor_id ? null : 'https://ui-avatars.com/api/?name=%2BV&background=ECA413&color=000')
    }));

    // 2. Fetch post thumbnails for 'like' and 'comment' notifications
    const postIds = notifications
      .filter(n => (n.type === 'like' || n.type === 'comment') && n.reference_id)
      .map(n => n.reference_id);

    if (postIds.length > 0) {
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, media_url')
        .in('id', postIds);

      if (postsData && postsData.length > 0) {
        const postImages = (postsData as any[]).reduce((acc, p) => {
          acc[p.id] = p.media_url;
          return acc;
        }, {} as Record<string, string>);

        notifications.forEach(n => {
          if (n.reference_id && postImages[n.reference_id]) {
            n.post_media_url = postImages[n.reference_id];
          }
        });
      }
    }

    return notifications;
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
  const actor = notif.actor_id ? (notif.actor_username || 'Alguém') : '+Vaquejada';
  switch (notif.type) {
    case 'follow':  return `${actor} começou a seguir você.`;
    case 'like':    return `${actor} curtiu sua publicação.`;
    case 'comment': return notif.message ? `${actor} comentou: "${notif.message}"` : `${actor} comentou em sua publicação.`;
    case 'message': return notif.message ? `${actor}: ${notif.message}` : `${actor} te enviou uma mensagem.`;
    case 'mention': return `${actor} te mencionou em um comentário.`;
    case 'system':  return notif.message || 'O +Vaquejada enviou um alerta sobre sua conta.';
    case 'auction_bid': return notif.message || `${actor} deu um lance em seu animal.`;
    case 'outbid': return notif.message || `Você foi superado em um leilão!`;
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

