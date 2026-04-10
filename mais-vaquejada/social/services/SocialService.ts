import { supabase } from '../../lib/supabase';
import { SocialPost, Story, StoryMedia, SocialComment, ArenaNotification, ChatMessage } from '../types';

export const SocialService = {
  // Feed & Posts
  async fetchFeed(userId: string, followingIds: string[] = []): Promise<SocialPost[]> {
    let query = supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (name, username, avatar_url, role)
      `)
      .order('created_at', { ascending: false });

    if (followingIds.length > 0) {
      query = query.in('user_id', [...followingIds, userId]);
    }

    query = query.or('is_hidden.is.null,is_hidden.eq.false');

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(p => ({
      id: p.id,
      userId: p.user_id,
      username: p.profiles?.username || 'vaqueiro',
      isVerified: p.profiles?.role?.includes('ADMIN'),
      location: p.location || 'Brasil',
      imageUrl: p.media_url,
      avatarUrl: p.profiles?.avatar_url,
      likes: '0',
      comments: 0,
      caption: p.caption || '',
      hashtags: [],
      timeAgo: 'RECENTE',
      isFeature: p.is_feature
    }));
  },

  // Stories
  async fetchStories(userId: string, followingIds: string[] = []): Promise<Story[]> {
    let query = supabase
      .from('stories')
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .gt('expires_at', new Date().toISOString());

    if (followingIds.length > 0) {
      query = query.in('user_id', [...followingIds, userId]);
    }

    const { data, error } = await query;
    if (error) throw error;

    const grouped = (data || []).reduce((acc: any, s: any) => {
      const username = s.profiles?.username || 'vaqueiro';
      if (!acc[username]) {
        acc[username] = {
          id: s.user_id,
          username: `@${username}`,
          avatar: s.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${username}&background=random`,
          items: [],
          hasNew: true
        };
      }
      acc[username].items.push({
        id: s.id,
        url: s.media_url,
        type: s.type || 'image',
        duration: 5000,
        created_at: s.created_at
      });
      return acc;
    }, {});

    return Object.values(grouped);
  },

  // Interactions
  async likePost(userId: string, postId: string) {
    const { error } = await supabase
      .from('post_likes')
      .upsert({ user_id: userId, post_id: postId });
    if (error) throw error;
  },

  async fetchComments(postId: string): Promise<SocialComment[]> {
    const { data, error } = await supabase
      .from('post_comments')
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(c => ({
      id: c.id,
      post_id: c.post_id,
      user_id: c.user_id,
      username: c.profiles?.username || 'vaqueiro',
      text: c.content,
      created_at: c.created_at,
      avatar_url: c.profiles?.avatar_url
    }));
  },

  // Relationships
  async fetchFollowing(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);
    
    if (error) throw error;
    return data?.map(f => f.following_id) || [];
  },

  // DMs
  async fetchConversations(userId: string) {
     // Ideally we'd have a conversations table, but based on current logic we might need to query messages
     // and group them. For refactor, let's keep it robust.
     const { data, error } = await supabase
       .from('messages')
       .select('*')
       .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
       .order('created_at', { ascending: false });
     if (error) throw error;
     return data;
  }
};
