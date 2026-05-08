import { supabase } from '../../lib/supabase';
import { SocialPost, Story, StoryMedia, SocialComment, ArenaNotification, ChatMessage } from '../types';

export const SocialService = {
  // Feed & Posts — now with real like/comment counts
  async fetchFeed(userId: string, followingIds: string[] = []): Promise<SocialPost[]> {
    const now = new Date().toISOString();
    const query = supabase
      .from('posts')
      .select(`*, profiles (id, username, avatar_url, role)`)
      .in('user_id', [userId, ...followingIds])
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data, error } = await query;
    if (error) { console.error('Erro ao carregar feed'); return []; }

    // 2. Fetch like + comment counts in parallel for all post IDs
    const postIds = (data || []).map(p => p.id);
    
    if (postIds.length === 0) {
      return (data || []).map(p => ({
        id: p.id,
        userId: p.user_id,
        username: p.profiles?.username || 'vaqueiro',
        avatarUrl: p.profiles?.avatar_url,
        isVerified: p.profiles?.role?.includes('ADMIN'),
        location: p.location || '',
        imageUrl: p.media_url,
        likes: 0,
        comments: 0,
        caption: p.caption || '',
        hashtags: (p.caption || '').match(/#[a-z0-9]+/gi) || [],
        timeAgo: this.timeAgo(p.created_at),
        isLiked: false
      }));
    }

    const [likesRes, commentsRes, myLikesRes] = await Promise.all([
      supabase.from('post_likes').select('post_id').in('post_id', postIds).limit(10000),
      supabase.from('post_comments').select('post_id').in('post_id', postIds).limit(10000),
      userId ? supabase.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', postIds) : Promise.resolve({ data: [] })
    ]);

    // Count likes per post
    const likeCounts: Record<string, number> = {};
    (likesRes.data || []).forEach(l => { likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1; });

    // Count comments per post
    const commentCounts: Record<string, number> = {};
    (commentsRes.data || []).forEach(c => { commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1; });

    // My liked posts
    const myLikedSet = new Set((myLikesRes.data || []).map(l => l.post_id));

    return (data || []).map(p => ({
      id: p.id,
      userId: p.user_id,
      username: p.profiles?.username || p.profiles?.name || 'vaqueiro',
      isVerified: p.profiles?.role?.includes('ADMIN'),
      location: p.location || 'Brasil',
      imageUrl: p.media_url,
      avatarUrl: p.profiles?.avatar_url,
      likes: likeCounts[p.id] || 0,
      comments: commentCounts[p.id] || 0,
      caption: p.caption || '',
      hashtags: [],
      timeAgo: getTimeAgo(p.created_at),
      isFeature: false,
      isLiked: myLikedSet.has(p.id)
    }));
  },

  // Stories — with automatic 24h cleanup
  async fetchStories(userId: string, followingIds: string[] = []): Promise<Story[]> {
    const authorizedIds = [...new Set([userId, ...followingIds])];
    const now = new Date().toISOString();

    // 1. LIMPEZA AUTOMÁTICA: Apagar stories que já venceram o prazo
    try {
      await supabase.from('stories').delete().lt('expires_at', now);
    } catch (e) {
      console.warn('Falha na limpeza de cache');
    }

    // 2. BUSCAR APENAS OS ATIVOS
    const { data, error } = await supabase
      .from('stories')
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .gt('expires_at', now)
      .in('user_id', authorizedIds)
      .order('created_at', { ascending: false });

    if (error) { console.error('Erro ao carregar stories'); return []; }

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
        type: s.media_type || 'image',
        duration: 5000,
        created_at: s.created_at,
        aspect_ratio: s.aspect_ratio,
        zoom: s.zoom,
        offset_x: s.offset_x,
        offset_y: s.offset_y
      });
      return acc;
    }, {});

    return Object.values(grouped);
  },

  // Like / Unlike
  async likePost(userId: string, postId: string) {
    const { error } = await supabase
      .from('post_likes')
      .insert({ user_id: userId, post_id: postId });
    if (error) { 
      console.error('Erro ao curtir postagem'); 
      throw new Error('Falha ao processar curtida'); 
    }
  },

  async unlikePost(userId: string, postId: string) {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);
    if (error) { 
      console.error('Erro ao descurtir postagem'); 
      throw new Error('Falha ao remover curtida'); 
    }
  },

  // Comments
  async fetchComments(postId: string): Promise<SocialComment[]> {
    const { data, error } = await supabase
      .from('post_comments')
      .select(`
        *,
        profiles (username, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (error) { console.error('Erro ao carregar comentários'); return []; }
    return (data || []).map(c => ({
      id: c.id,
      post_id: c.post_id,
      user_id: c.user_id,
      username: (c as any).profiles?.username || 'vaqueiro',
      text: c.content,
      created_at: c.created_at,
      avatar_url: (c as any).profiles?.avatar_url
    }));
  },

  async postComment(userId: string, postId: string, content: string) {
    const { data, error } = await supabase
      .from('post_comments')
      .insert({ user_id: userId, post_id: postId, content })
      .select(`*, profiles (username, avatar_url)`)
      .single();

    if (error) {
      console.error('Erro ao publicar comentário');
      throw new Error('Falha ao enviar comentário');
    }
    return data;
  },

  // Relationships
  async fetchFollowing(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);
    
    if (error) { console.warn('Erro ao carregar lista de seguidores'); return []; }
    return data?.map(f => f.following_id) || [];
  },

  // DMs
  async fetchConversations(userId: string) {
     const { data, error } = await supabase
       .from('messages')
       .select('*')
       .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
       .order('created_at', { ascending: false });
     if (error) { console.warn('Erro ao carregar conversas'); return []; }
     return data;
  },

  async deletePost(postId: string) {
    // 1. Get post data first to know the media URL
    const { data: post } = await supabase
      .from('posts')
      .select('media_url, user_id')
      .eq('id', postId)
      .single();

    if (!post) throw new Error('Postagem não encontrada');

    // 2. Delete from database
    const { error: dbError } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (dbError) throw dbError;

    // 3. Try to delete from storage if it's a supabase URL
    if (post.media_url && post.media_url.includes('/storage/v1/object/public/vaquejadas/')) {
      try {
        const path = post.media_url.split('/vaquejadas/')[1].split('?')[0];
        if (path) {
          await supabase.storage.from('vaquejadas').remove([path]);
        }
      } catch (e) {
        console.warn('Falha ao remover arquivo do storage');
        // We don't throw here, the record is already gone
      }
    }

    return true;
  },

  async deleteStory(storyId: string) {
    // 1. Get story data
    const { data: story } = await supabase
      .from('stories')
      .select('media_url')
      .eq('id', storyId)
      .single();

    if (!story) throw new Error('Story não encontrado');

    // 2. Delete from database
    const { error: dbError } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId);

    if (dbError) throw dbError;

    // 3. Delete from storage
    if (story.media_url && story.media_url.includes('/storage/v1/object/public/vaquejadas/')) {
      try {
        const path = story.media_url.split('/vaquejadas/')[1].split('?')[0];
        if (path) {
          await supabase.storage.from('vaquejadas').remove([path]);
        }
      } catch (e) {
        console.warn('Falha ao remover arquivo do storage');
      }
    }
    return true;
  }
};

// Utility: human-readable time ago
function getTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'AGORA';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}sem`;
}
