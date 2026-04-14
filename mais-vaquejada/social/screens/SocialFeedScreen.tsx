import React, { useState, useEffect } from 'react';
import { useFeed } from '../hooks/useFeed';
import { useSocialInteractions } from '../hooks/useSocialInteractions';
import { useDMs } from '../hooks/useDMs';
import { useNotifications } from '../hooks/useNotifications';
import { useInternalAds } from '../hooks/useInternalAds';
import { PostCard } from '../components/PostCard';
import { SponsoredFeedCard } from '../components/SponsoredFeedCard';
import { StoryBar } from '../components/StoryBar';
import { StoryViewer } from '../components/StoryViewer';
import { CommentSheet } from '../components/CommentSheet';
import { NotificationsPanel } from '../components/NotificationsPanel';
import { DMInbox } from '../components/DMInbox';
import { ChatThread } from '../components/ChatThread';
import { ShareSheet } from '../components/ShareSheet';
import { SocialErrorBoundary } from '../components/SocialErrorBoundary';
import { supabase } from '../../lib/supabase';
import { useCall } from '../../context/CallContext';

interface SocialFeedScreenProps {
  user: any;
  onMediaCreation: () => void;
}

const SocialFeedScreen: React.FC<SocialFeedScreenProps> = ({ user, onMediaCreation }) => {
  const { posts, stories, loading, isRefreshing, error, refresh } = useFeed(user?.id);
  const { notifications, unreadCount, markAsRead } = useNotifications(user?.id);
  const { likedPosts, likeCounts, toggleLike, commentsMap, commentCounts, loadComments, postComment, commentLoading, initFromFeed } = useSocialInteractions(user);
  const { conversations, activeMessages, fetchConversations, fetchMessages, sendMessage } = useDMs(user);
  const { injectAdsIntoFeed, trackImpression, trackClickAndAct } = useInternalAds({ 
    placement: 'social_feed_native', 
    userId: user?.id,
    insertionFrequency: 4
  });
  
  const { injectAdsIntoFeed: injectStoryAds, trackImpression: trackStoryImpression, trackClickAndAct: trackStoryClick } = useInternalAds({ 
    placement: 'story_sponsored', 
    userId: user?.id,
    insertionFrequency: 5
  });
  const { startCall } = useCall();

  // State for overlays
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isDMScreenOpen, setIsDMScreenOpen] = useState(false);
  const [activeChatPartnetId, setActiveChatPartnerId] = useState<string | null>(null);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [activeSharePost, setActiveSharePost] = useState<any | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Post Options & Editing
  const [optionsPost, setOptionsPost] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Derived stories to include active sponsored placements
  const mixedStories = React.useMemo(() => {
    return injectStoryAds(stories).map((item: any) => {
      if (item.isAd) {
        return {
          id: `ad-${item.campaign.id}`,
          username: item.campaign.advertiser_name,
          avatar: item.campaign.advertiser_logo_url || item.campaign.main_media_url,
          hasNew: true,
          isAd: true,
          campaign: item.campaign,
          items: [
            {
              id: item.campaign.id,
              url: item.campaign.main_media_url,
              type: item.campaign.media_type,
              createdAt: item.campaign.created_at,
            }
          ]
        };
      }
      return item;
    });
  }, [stories, injectStoryAds]);

  // Navigation Utilities
  const navigateToProfile = (username: string) => {
    const formatted = username.startsWith('@') ? username.substring(1) : username;
    const isMe = user && (formatted === user.username || username === 'meu-perfil');
    window.dispatchEvent(new CustomEvent('arena_navigate', { 
      detail: { view: 'PROFILE', username: isMe ? null : formatted } 
    }));
  };

  const handleNotificationPress = (notif: any) => {
    if (notif.type === 'message') {
      setActiveChatPartnerId(notif.actor_id);
      setIsDMScreenOpen(true);
      setIsNotificationsOpen(false);
    } else {
      navigateToProfile(notif.actor_username);
      setIsNotificationsOpen(false);
    }
  };

  const handleSendMessage = (text: string) => {
    if (activeChatPartnetId) {
      sendMessage(activeChatPartnetId, text);
    }
  };

  // Initialize like/comment counts when posts arrive
  React.useEffect(() => {
    if (posts.length > 0) initFromFeed(posts);
  }, [posts, initFromFeed]);

  const handlePostComment = async (postId: string, text: string) => {
    const post = posts.find(p => p.id === postId);
    await postComment(postId, text, post?.userId);
  };

  const handleDeletePost = async () => {
    if (!optionsPost || !confirm('Tem certeza que deseja excluir esta postagem permanentemente?')) return;
    try {
      const { error } = await supabase.from('posts').delete().eq('id', optionsPost.id);
      if (error) throw error;
      setOptionsPost(null);
      refresh(); // Refresh feed after delete
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const handleUpdatePost = async () => {
    if (!optionsPost) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase.from('posts').update({
        caption: editCaption,
        location: editLocation
      }).eq('id', optionsPost.id);
      if (error) throw error;
      setIsEditing(false);
      setOptionsPost(null);
      refresh(); // Refresh feed to show changes
    } catch (err: any) {
      alert('Erro ao atualizar: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };


  // Search Logic
  useEffect(() => {
    const search = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      const cleanQuery = searchQuery.replace('@', '').trim();
      const { data } = await supabase
        .from('profiles')
        .select('id, username, name, full_name, avatar_url, role')
        .or(`username.ilike.%${cleanQuery}%,name.ilike.%${cleanQuery}%,full_name.ilike.%${cleanQuery}%`)
        .neq('id', user?.id)
        .limit(15);
      setSearchResults(data || []);
    };
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user?.id]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center bg-background-dark min-h-screen">
          <span className="material-icons text-red-500 text-6xl mb-4">error_outline</span>
          <h2 className="text-[#ECA413] font-black uppercase tracking-tighter mb-2 italic">Ops! Erro de conexão</h2>
          <p className="text-white/60 text-xs mb-6 max-w-xs">{error}</p>
          <button onClick={refresh} className="px-6 py-3 bg-[#ECA413] text-background-dark rounded-full font-black uppercase text-[10px] tracking-widest">Recarregar Feed</button>
      </div>
    );
  }

  const activePostForComments = posts.find(p => p.id === activeCommentPostId);
  const activePartner = conversations.find(c => c.other_user_id === activeChatPartnetId) || searchResults.find(r => r.id === activeChatPartnetId);

  return (
    <div className="bg-background-dark min-h-full font-display relative overflow-y-auto">
      {/* Header */}
      <header className="flex justify-between items-center px-4 py-3 sticky top-0 z-50 bg-background-dark/95 backdrop-blur-md border-b border-white/5">
        <div className="flex flex-col">
          <h1 className="text-2xl font-black uppercase tracking-tighter text-[#ECA413] italic truncate">+VAQUEJADA</h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button className="relative" onClick={() => setIsSearchOpen(true)}>
            <span className="material-icons text-2xl text-white">search</span>
          </button>
          <button className="relative" onClick={() => { setIsNotificationsOpen(true); markAsRead(); }}>
            <span className={`material-icons text-2xl ${isNotificationsOpen ? 'text-[#ECA413]' : 'text-white'}`}>favorite_border</span>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#ECA413] border-2 border-background-dark rounded-full animate-pulse"></span>
            )}
          </button>
          <button className="relative" onClick={() => { setIsDMScreenOpen(true); fetchConversations(); }}>
            <span className="material-icons text-2xl text-white">send</span>
          </button>
        </div>
      </header>

      {/* Stories */}
      <StoryBar 
        stories={mixedStories} 
        user={user} 
        onMePress={onMediaCreation} 
        onStoryPress={setActiveStoryIndex} 
        onProfilePress={navigateToProfile}
      />

      {/* Feed */}
      <main className="pb-20">
        {loading && !isRefreshing ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-2 border-[#ECA413] border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black text-[#ECA413] uppercase tracking-widest animate-pulse">Carregando Arena...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-10 text-center opacity-20">
            <span className="material-icons text-6xl mb-4">grid_view</span>
            <p className="text-xs font-black uppercase tracking-widest">Nenhuma postagem encontrada no momento</p>
          </div>
        ) : (
          injectAdsIntoFeed(posts).map((item: any, index: number) => {
            if (item.isAd) {
              return (
                <SponsoredFeedCard 
                  key={`ad-${item.campaign.id}-${index}`}
                  campaign={item.campaign}
                  feedPosition={index}
                  onImpression={trackImpression}
                  onClick={trackClickAndAct}
                />
              );
            }
            const post = item;
            return (
              <PostCard 
                key={post.id}
                post={post}
                isLiked={likedPosts.has(post.id)}
                likeCount={likeCounts[post.id] || 0}
                commentCount={commentCounts[post.id] || 0}
                onLike={toggleLike}
                onComment={(p) => { setActiveCommentPostId(p.id); loadComments(p.id); }}
                onShare={(p) => setActiveSharePost(p)}
                onNavigateToProfile={navigateToProfile}
                onOptions={(p) => {
                   setOptionsPost(p);
                   setEditCaption(p.caption || '');
                   setEditLocation(p.location || '');
                }}
                currentUserId={user?.id}
              />
            );
          })
        )}
      </main>

      {/* Overlays */}
      {activeStoryIndex !== null && (
        <StoryViewer 
          stories={mixedStories} 
          initialUserIndex={activeStoryIndex} 
          onClose={() => setActiveStoryIndex(null)}
          onNavigateToProfile={navigateToProfile}
          onShare={() => {}}
          onAdImpression={(id) => trackStoryImpression(id, activeStoryIndex)}
          onAdClick={trackStoryClick}
        />
      )}

      {isNotificationsOpen && (
        <NotificationsPanel 
          notifications={notifications}
          onClose={() => setIsNotificationsOpen(false)}
          onNotificationPress={handleNotificationPress}
        />
      )}

      {isDMScreenOpen && (
        <div className="fixed inset-0 z-[200] bg-background-dark flex flex-col animate-in slide-in-from-right duration-300">
          {activeChatPartnetId ? (
            <ChatThread 
              partnerId={activeChatPartnetId}
              partnerUsername={activePartner?.other_username || activePartner?.username || '...'}
              partnerAvatar={activePartner?.other_avatar || activePartner?.avatar_url}
              messages={activeMessages}
              currentUserId={user?.id}
              onSendMessage={handleSendMessage}
              onCall={(type) => startCall?.([activeChatPartnetId], type)}
              onBack={() => setActiveChatPartnerId(null)}
              onNavigateToProfile={navigateToProfile}
            />
          ) : (
            <div className="flex flex-col h-full">
              <header className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-background-dark/95 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <button onClick={() => setIsDMScreenOpen(false)} className="material-icons text-white">arrow_back</button>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Mensagens</h3>
                </div>
              </header>
              <DMInbox 
                conversations={conversations}
                onSelectConversation={(id) => { setActiveChatPartnerId(id); fetchMessages(id); }}
                onSearch={setSearchQuery}
                searchQuery={searchQuery}
                searchResults={searchResults}
                userId={user?.id}
              />
            </div>
          )}
        </div>
      )}

      {activeCommentPostId && activePostForComments && (
        <CommentSheet 
          post={activePostForComments}
          comments={commentsMap[activeCommentPostId] || []}
          user={user}
          onClose={() => setActiveCommentPostId(null)}
          onPostComment={(text) => handlePostComment(activeCommentPostId, text)}
          onNavigateToProfile={navigateToProfile}
        />
      )}

      {/* Search Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[300] bg-background-dark flex flex-col animate-in slide-in-from-top duration-300">
          {/* Search Header */}
          <header className="px-4 py-3 flex items-center gap-3 border-b border-white/5 bg-background-dark/95 backdrop-blur-md">
            <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); setSearchResults([]); }} className="material-icons text-white shrink-0">arrow_back</button>
            <div className="flex-1 flex items-center bg-white/10 rounded-full px-4 py-2.5 border border-white/10">
              <span className="material-icons text-white/40 text-[20px] mr-2">search</span>
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-white text-sm w-full placeholder:text-white/40"
                placeholder="Buscar por @usuario ou nome..."
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="material-icons text-white/30 text-[18px] hover:text-white">close</button>
              )}
            </div>
          </header>

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            {searchQuery.length < 2 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-20">
                <span className="material-icons text-5xl mb-4">person_search</span>
                <p className="text-xs font-black uppercase tracking-widest text-white">Digite o @ ou nome</p>
                <p className="text-[10px] text-white/40 mt-1">Mínimo 2 caracteres</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-20">
                <span className="material-icons text-5xl mb-4">search_off</span>
                <p className="text-xs font-black uppercase tracking-widest text-white">Nenhum vaqueiro encontrado</p>
                <p className="text-[10px] text-white/40 mt-1">Tente outro nome ou @</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {searchResults.map((result: any) => (
                  <div
                    key={result.id}
                    onClick={() => { setIsSearchOpen(false); setSearchQuery(''); navigateToProfile(result.username || result.id); }}
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full border border-[#ECA413]/30 p-0.5 shrink-0 bg-neutral-800 overflow-hidden">
                      <img
                        src={result.avatar_url || `https://ui-avatars.com/api/?name=${result.name || result.username}&background=random`}
                        className="w-full h-full object-cover rounded-full"
                        alt=""
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${result.username}&background=random`; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-white text-sm truncate flex items-center gap-1">
                        {result.name || result.username}
                        {result.role?.includes('ADMIN') && <span className="material-icons text-[#ECA413] text-[14px]">verified</span>}
                      </p>
                      <p className="text-[12px] font-bold text-[#ECA413] truncate">@{result.username}</p>
                    </div>
                    <span className="material-icons text-white/20 text-[20px]">chevron_right</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSharePost && (
        <ShareSheet
          post={activeSharePost}
          user={user}
          onClose={() => setActiveSharePost(null)}
          onShareComplete={() => setActiveSharePost(null)}
        />
      )}
      {/* Post Options Menu */}
      {optionsPost && (
        <div className="fixed inset-0 z-[600] flex items-end justify-center bg-black/60 animate-in fade-in duration-300 px-4 pb-8" onClick={() => !isEditing && setOptionsPost(null)}>
          <div className="bg-background-dark w-full max-w-sm rounded-[32px] overflow-hidden border border-white/5 shadow-2xl animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            {!isEditing ? (
              <div className="p-2">
                <button 
                  onClick={() => setIsEditing(true)}
                  className="w-full flex items-center gap-4 px-6 py-5 text-white hover:bg-white/5 active:bg-white/10 transition-colors"
                >
                  <span className="material-icons opacity-40">edit</span>
                  <span className="font-black text-xs uppercase tracking-widest text-[#ECA413]">Editar Postagem</span>
                </button>
                <div className="h-px bg-white/5 mx-6" />
                <button 
                  onClick={handleDeletePost}
                  className="w-full flex items-center gap-4 px-6 py-5 text-red-500 hover:bg-red-500/10 active:bg-red-500/20 transition-colors"
                >
                  <span className="material-icons opacity-60">delete_outline</span>
                  <span className="font-black text-xs uppercase tracking-widest">Excluir Postagem</span>
                </button>
                <div className="h-px bg-white/5 mx-6" />
                <button 
                  onClick={() => setOptionsPost(null)}
                  className="w-full flex items-center gap-4 px-6 py-5 text-white/40 hover:bg-white/5 active:bg-white/10 transition-colors"
                >
                  <span className="material-icons opacity-40">close</span>
                  <span className="font-black text-xs uppercase tracking-widest">Cancelar</span>
                </button>
              </div>
            ) : (
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#ECA413] italic">Editar Publicação</h3>
                  <button onClick={() => setIsEditing(false)} className="material-icons text-white/40">close</button>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Legenda</label>
                    <textarea
                      value={editCaption}
                      onChange={e => setEditCaption(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-[#ECA413] outline-none min-h-[100px] resize-none"
                      placeholder="O que está acontecendo na arena?"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Localização</label>
                    <div className="relative">
                      <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-[#ECA413] text-xl">place</span>
                      <input
                        type="text"
                        value={editLocation}
                        onChange={e => setEditLocation(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm text-white focus:border-[#ECA413] outline-none uppercase font-black"
                        placeholder="CIDADE - ESTADO"
                      />
                    </div>
                  </div>
                  
                  <button
                    disabled={savingEdit}
                    onClick={handleUpdatePost}
                    className="w-full bg-[#ECA413] text-background-dark py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-[#ECA413]/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {savingEdit ? 'Salvando...' : 'Atualizar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function SocialFeedScreenWrapper(props: SocialFeedScreenProps) {
  return (
    <SocialErrorBoundary>
      <SocialFeedScreen {...props} />
    </SocialErrorBoundary>
  );
}
