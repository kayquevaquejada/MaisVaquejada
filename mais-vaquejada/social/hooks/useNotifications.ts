import { useState, useEffect, useCallback } from 'react';
import { ArenaNotification, fetchUserNotifications, markNotificationsAsRead } from '../../lib/notifications';
import { supabase } from '../../lib/supabase';

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<ArenaNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await fetchUserNotifications(userId);
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const markAsRead = async () => {
    if (!userId) return;
    try {
      await markNotificationsAsRead(userId);
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  useEffect(() => {
    loadNotifications();
    
    // Realtime subscription
    if (userId) {
      const channel = supabase
        .channel(`notifications_${userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        }, () => {
          loadNotifications();
        })
        .subscribe();
        
      return () => { supabase.removeChannel(channel); };
    }
  }, [userId, loadNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    refresh: loadNotifications
  };
}
