import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { ChatMessage, ChatConversation } from '../types';

export function useDMs(user: any) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // In a real app, we'd have a conversations view or table.
      // Based on the current schema, we'll fetch unique communication partners from messages.
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group into conversations
      const partners: Record<string, ChatConversation> = {};
      data.forEach(m => {
        const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        if (!partners[partnerId]) {
          partners[partnerId] = {
            id: partnerId, // Simplified
            other_user_id: partnerId,
            other_username: '...', // Need to fetch profiles
            unread_count: 0,
            last_message: m.content,
            last_message_time: m.created_at
          };
        }
      });
      
      // Fetch profile details for all partners
      const partnerIds = Object.keys(partners);
      if (partnerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', partnerIds);
        
        profiles?.forEach(p => {
          if (partners[p.id]) {
            partners[p.id].other_username = p.username;
            partners[p.id].other_avatar = p.avatar_url;
          }
        });
      }

      setConversations(Object.values(partners));
    } catch (err) {
      console.error('fetchConversations error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchMessages = useCallback(async (partnerId: string) => {
    if (!user?.id || !partnerId) return;
    setActivePartnerId(partnerId); // Marcar quem é o parceiro atual
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Só atualiza se o usuário ainda estiver na conversa com ESSE parceiro
      setActiveMessages(data || []);
    } catch (err) {
      console.error('fetchMessages error:', err);
    }
  }, [user?.id]);

  const sendMessage = async (partnerId: string, content: string) => {
    if (!user?.id || !content.trim()) return;
    const msg = {
      sender_id: user.id,
      receiver_id: partnerId,
      content: content.trim()
    };
    
    // Optimistic Update
    const tempId = Date.now().toString();
    const optimisticMsg: ChatMessage = { 
        id: tempId, 
        ...msg, 
        created_at: new Date().toISOString(),
        is_read: false 
    };
    setActiveMessages(prev => [...prev, optimisticMsg]);

    const { data, error } = await supabase
      .from('messages')
      .insert([msg])
      .select()
      .single();
    
    if (error) {
        console.error('ERRO CRÍTICO NO CHAT:', error);
        alert('O banco recusou sua mensagem: ' + error.message);
        // Rollback
        setActiveMessages(prev => prev.filter(m => m.id !== tempId));
    } else {
        setActiveMessages(prev => prev.map(m => m.id === tempId ? data : m));
    }
  };

  // Realtime subscription for messages
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`db-messages-${user.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`
      }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        
        // SÓ ADICIONA À TELA SE FOR DO PARCEIRO QUE ESTOU OLHANDO AGORA
        if (newMsg.sender_id === activePartnerId || newMsg.receiver_id === activePartnerId) {
          setActiveMessages(prev => {
             if (prev.find(m => m.id === newMsg.id)) return prev;
             return [...prev, newMsg];
          });
        }
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchConversations]);

  return {
    conversations,
    activeMessages,
    loading,
    fetchConversations,
    fetchMessages,
    sendMessage
  };
}
