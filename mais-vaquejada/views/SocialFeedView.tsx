
import React, { useState, useEffect, useRef } from 'react';
import { PostItem, StoryItem } from '../types';
import { supabase } from '../lib/supabase';

const STORY_GROUPS = [
  { id: '1', username: 'Seu Status', avatar: 'https://picsum.photos/seed/my/100', items: [], hasNew: false },
];

const INITIAL_POSTS: PostItem[] = [];

interface SocialFeedViewProps {
  user: any; // Using any to avoid strict type issues for now
  onMediaCreation: () => void;
}

const SocialFeedView: React.FC<SocialFeedViewProps> = ({ user, onMediaCreation }) => {
  const [feedPosts, setFeedPosts] = useState<PostItem[]>([]);
  const [stories, setStories] = useState<any[]>(STORY_GROUPS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = async () => {
    setLoading(true);
    setError(null);
    try {
        // Filter logic: Only following (or global if it's the first time)
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user?.id);
        
        const followingIds = followingData?.map(f => f.following_id) || [];
        
        let query = supabase
          .from('posts')
          .select(`
            *,
            profiles:user_id (name, username, avatar_url, role)
          `)
          .order('created_at', { ascending: false });

        // If following anyone, filter the feed!
        if (followingIds.length > 0) {
           query = query.in('user_id', [...followingIds, user?.id]); // My posts + Following
        }

        // Exclude hidden posts
        query = query.or('is_hidden.is.null,is_hidden.eq.false');

        const { data: postsData, error: postsError } = await query;
 
        if (postsError) throw postsError;
 
        if (postsData) {
          setFeedPosts(postsData.map(p => ({
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
            timeAgo: 'RECENTE'
          })));
        }

      // 2. Fetch Stories (Filtered by following like the posts)
      let storyQuery = supabase
        .from('stories')
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .gt('expires_at', new Date().toISOString());

      if (followingIds.length > 0) {
          storyQuery = storyQuery.in('user_id', [...followingIds, user?.id]);
      }

      const { data: storiesData } = await storyQuery;

      if (storiesData) {
          // Group stories by user
          const grouped = storiesData.reduce((acc: any, s: any) => {
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

          const myStories = storiesData.filter(s => s.user_id === user?.id).map(s => ({
              id: s.id,
              url: s.media_url,
              type: s.type || 'image',
              duration: 5000,
              created_at: s.created_at
          }));

          const storyList = [
            { 
              id: '1', 
              username: 'Seu Status', 
              avatar: user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`, 
              items: myStories, 
              hasNew: false 
            },
            ...Object.values(grouped).filter((g: any) => g.id !== user?.id)
          ];
          setStories(storyList);
      } else {
          setStories([
            { 
              id: '1', 
              username: 'Seu Status', 
              avatar: user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`, 
              items: [], 
              hasNew: false 
            }
          ]);
      }
    } catch (err: any) {
      console.error('Error fetching feed:', err);
      setError(`Erro ao carregar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  // Pull to refresh logic
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [pullMove, setPullMove] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
        setStartY(e.touches[0].pageY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY) {
        const currentY = e.touches[0].pageY;
        const diff = currentY - startY;
        if (diff > 0) {
            setPullMove(Math.min(diff / 2, 80));
        }
    }
  };

  const handleTouchEnd = () => {
    if (pullMove > 50) {
        handleRefresh();
    }
    setStartY(0);
    setPullMove(0);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchFeed();
    setIsRefreshing(false);
  };
  const [activeUserIndex, setActiveUserIndex] = useState<number | null>(null);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);

  // DM State
  const [isDMScreenOpen, setIsDMScreenOpen] = useState(false);
  const [activeChatUser, setActiveChatUser] = useState<string | null>(null);
  const [activeChatProfile, setActiveChatProfile] = useState<any>(null);

  useEffect(() => {
    if (activeChatUser) {
      supabase.from('profiles').select('*').eq('username', activeChatUser).single().then(({data}) => {
         if (data) setActiveChatProfile(data);
      });
    } else {
      setActiveChatProfile(null);
    }
  }, [activeChatUser]);

  const [messages, setMessages] = useState<{sender: string, text: string, time: string, chatWith: string}[]>(() => {
    const saved = localStorage.getItem('arena_dms');
    return saved ? JSON.parse(saved) : [];
  });
  const [newMessage, setNewMessage] = useState('');

  const [dmSearchQuery, setDmSearchQuery] = useState('');
  const [dmSearchResults, setDmSearchResults] = useState<any[]>([]);

  useEffect(() => {
    const searchDMUsers = async () => {
      if (dmSearchQuery.length < 2) {
        setDmSearchResults([]);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${dmSearchQuery}%,full_name.ilike.%${dmSearchQuery}%`)
        .limit(10);
      
      if (data) setDmSearchResults(data);
    };
    const timer = setTimeout(searchDMUsers, 300);
    return () => clearTimeout(timer);
  }, [dmSearchQuery]);

  useEffect(() => {
    // Solicita permissão de Notificação Nativa (Push)
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Persist DMs
  useEffect(() => {
    localStorage.setItem('arena_dms', JSON.stringify(messages));
  }, [messages]);

  // Additional Social States (Comments & Notifications)
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [activeCommentsPost, setActiveCommentsPost] = useState<PostItem | null>(null);
  const [commentText, setCommentText] = useState('');
  const [postComments, setPostComments] = useState<{username: string, text: string, time: string}[]>([]);
  
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(() => {
    const saved = localStorage.getItem('arena_has_unread_notifs');
    return saved ? saved === 'true' : false; // Default false unless specifically true in storage
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPostOptionsOpen, setIsPostOptionsOpen] = useState(false);
  const [selectedPostOptions, setSelectedPostOptions] = useState<PostItem | null>(null);
  const [isAboutAccountOpen, setIsAboutAccountOpen] = useState(false);
  const [hasUnreadDMs, setHasUnreadDMs] = useState(() => {
    return localStorage.getItem('arena_has_unread_dms') === 'true';
  });
  const [notifications, setNotifications] = useState<{ id: number, type: string, user: string, text: string, time: string, postId?: string }[]>(() => {
    const saved = localStorage.getItem('arena_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  // Mentions logic
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const MOCK_USERS_FOR_MENTIONS = ['vitor_vaqueiro', 'ana_montaria', 'haras_nobre', 'parque_palmeira', 'joao_vaquejada'];

  // Persist Notifications
  useEffect(() => {
    localStorage.setItem('arena_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('arena_has_unread_notifs', hasUnreadNotifications.toString());
  }, [hasUnreadNotifications]);

  useEffect(() => {
    localStorage.setItem('arena_has_unread_dms', hasUnreadDMs.toString());
  }, [hasUnreadDMs]);

  const [searchQueryResult, setSearchQueryResult] = useState<any[]>([]);

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 2) {
        setSearchQueryResult([]);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .limit(5);
      
      if (data) setSearchQueryResult(data);
    };
    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // handle detection of @
  const handleCommentChange = (text: string) => {
    setCommentText(text);
    const lastWord = text.split(/\s/).pop() || '';
    if (lastWord.startsWith('@') && lastWord.length > 1) {
        setMentionQuery(lastWord.substring(1).toLowerCase());
        setShowMentionSuggestions(true);
    } else {
        setShowMentionSuggestions(false);
    }
  };

  const insertMention = (username: string) => {
    const words = commentText.split(/\s/);
    words.pop(); // remove the partial mention
    const newText = [...words, `@${username} `].join(' ');
    setCommentText(newText);
    setShowMentionSuggestions(false);
  };

  const handlePostComment = () => {
    if (commentText.trim() && activeCommentsPost) {
        // Handle mentions in the text
        const mentions = commentText.match(/@(\w+)/g);
        if (mentions) {
            mentions.forEach(m => {
                const target = m.substring(1);
                // Locally, we simulate adding it to notifications
                const newNotif = {
                    id: Date.now() + Math.random(),
                    type: 'mention',
                    user: user?.username || 'voce_vaqueiro',
                    text: `mencionou você em um comentário no post de ${activeCommentsPost.username}.`,
                    time: 'agora',
                    postId: activeCommentsPost.id
                };
                setNotifications(prev => [newNotif, ...prev]);
                setHasUnreadNotifications(true);
            });
        }

        const newComment = {
            username: user?.username || 'meu_perfil',
            text: commentText,
            time: 'Agora'
        };
        
        setPostComments(prev => [newComment, ...prev]);

        // Update comment count in feed
        setFeedPosts(prev => prev.map(p => {
            if (p.id === activeCommentsPost.id) {
                return { ...p, comments: (p.comments || 0) + 1 };
            }
            return p;
        }));

        setCommentText('');
        setShowMentionSuggestions(false);
    }
  };

  // Logic to handle direct navigation to a chat
  useEffect(() => {
    const handleSocialNav = (e: any) => {
        if (e.detail?.openDM) {
            setIsDMScreenOpen(true);
            setActiveChatUser(e.detail.openDM);
        }
    };
    window.addEventListener('arena_navigate', handleSocialNav);
    return () => window.removeEventListener('arena_navigate', handleSocialNav);
  }, []);

  const handleShare = (post: PostItem) => {
    if (navigator.share) {
      navigator.share({
        title: `Post de ${post.username} no +Vaquejada`,
        text: post.caption,
        url: window.location.href,
      }).catch(err => console.error('Erro ao compartilhar', err));
    } else {
      alert(`Link do post copiado: ${window.location.href}`);
    }
  };

  const navigateToProfile = (username: string) => {
    // format username by removing @
    const formatted = username.startsWith('@') ? username.substring(1) : username;
    const isMe = user && (formatted === user.username || username === 'meu-perfil');
    window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view: 'PROFILE', username: isMe ? null : formatted } }));
  };

  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (activeUserIndex !== null) {
      setStoryProgress(0);
      progressInterval.current = setInterval(() => {
        setStoryProgress(prev => {
          if (prev >= 100) {
            handleNextStory();
            return 100;
          }
          return prev + 1;
        });
      }, 50); // 5 seconds per story
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current);
    }
    return () => { if (progressInterval.current) clearInterval(progressInterval.current); };
  }, [activeUserIndex, activeItemIndex]);

  const handleNextStory = () => {
    if (activeUserIndex === null) return;

    const currentUser = STORY_GROUPS[activeUserIndex];
    if (activeItemIndex < currentUser.items.length - 1) {
      // Proximo item do mesmo usuario
      setActiveItemIndex(activeItemIndex + 1);
    } else if (activeUserIndex < STORY_GROUPS.length - 1) {
      // Proximo usuario
      setActiveUserIndex(activeUserIndex + 1);
      setActiveItemIndex(0);
    } else {
      // Fim de todos os stories
      setActiveUserIndex(null);
      setActiveItemIndex(0);
    }
  };

  const handlePrevStory = () => {
    if (activeUserIndex === null) return;

    if (activeItemIndex > 0) {
      setActiveItemIndex(activeItemIndex - 1);
    } else if (activeUserIndex > 0) {
      // Usuario anterior (e vai para o ultimo item dele)
      const prevUserIndex = activeUserIndex - 1;
      setActiveUserIndex(prevUserIndex);
      setActiveItemIndex(STORY_GROUPS[prevUserIndex].items.length - 1);
    } else {
      // Primeiro de tudo, fecha
      setActiveUserIndex(null);
      setActiveItemIndex(0);
    }
  };

  const handleLike = (postId: string) => {
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  return (
    <div 
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="bg-background-dark min-h-full font-display relative overflow-y-auto"
    >
      {/* Pull to Refresh Indicator */}
      <div 
        className="absolute left-0 right-0 flex justify-center transition-all duration-200 pointer-events-none"
        style={{ 
          top: `${pullMove - 40}px`,
          opacity: pullMove / 50
        }}
      >
        <div className="bg-[#ECA413] w-10 h-10 rounded-full flex items-center justify-center shadow-2xl border border-white/10">
          <span className={`material-icons text-background-dark text-xl transition-transform ${isRefreshing ? 'animate-spin' : ''}`}>
            {isRefreshing ? 'sync' : 'arrow_downward'}
          </span>
        </div>
      </div>
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 sticky top-0 z-50 bg-background-dark/95 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-black uppercase tracking-tighter text-[#ECA413] italic">+VAQUEJADA</h1>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsSearchOpen(true)} 
            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 active:scale-90 transition-transform cursor-pointer"
          >
            <span className="material-icons text-xl text-white">search</span>
          </button>

          <button 
            onClick={() => navigateToProfile('meu-perfil')}
            className="w-8 h-8 rounded-full border border-[#ECA413] p-0.5 overflow-hidden active:scale-90 transition-transform"
          >
            <img 
              src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`} 
              className="w-full h-full rounded-full object-cover" 
              alt="Profile"
            />
          </button>
          
          <button className="relative" onClick={() => { setIsNotificationsOpen(!isNotificationsOpen); setHasUnreadNotifications(false); }}>
            <span className={`material-icons text-2xl ${isNotificationsOpen ? 'text-[#ECA413]' : 'text-white'}`}>favorite_border</span>
            {hasUnreadNotifications && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#ECA413] border-2 border-background-dark rounded-full"></span>
            )}
          </button>

          <button className="relative" onClick={() => { setIsDMScreenOpen(true); setHasUnreadDMs(false); }}>
            <span className="material-icons text-2xl text-white">send</span>
            {hasUnreadDMs && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#ECA413] border-2 border-background-dark rounded-full"></span>
            )}
          </button>
        </div>
      </header>

      {/* Notifications Overlay */}
      {isNotificationsOpen && (
        <>
            {/* Click Outside to Dismiss */}
            <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)}></div>
            <div className="absolute top-[68px] right-4 w-[300px] z-50 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 overflow-hidden">
                <div className="p-4 border-b border-white/10">
                <h3 className="font-black text-white tracking-widest text-[11px] uppercase">Ações & Notificações</h3>
            </div>
            <div className="max-h-[350px] overflow-y-auto">
                {notifications.map(notif => (
                    <div 
                        key={notif.id} 
                        className="p-4 border-b border-white/5 flex gap-3 items-center hover:bg-white/5 transition-colors cursor-pointer" 
                        onClick={() => {
                            if (notif.postId) {
                                // Close notifications and find the post - for demo we just alerts
                                setIsNotificationsOpen(false);
                                // In a real app, we'd scroll to or open that post
                                alert(`Navegando para o post ID: ${notif.postId}`);
                            } else {
                                navigateToProfile(notif.user);
                            }
                        }}
                    >
                        <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden shrink-0">
                            <img src={`https://picsum.photos/seed/${notif.user}/100`} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[12px] text-white/90 leading-tight">
                                <span className="font-black mr-1">{notif.user}</span>
                                {notif.text}
                            </p>
                            <p className="text-[#ECA413] text-[9px] font-black uppercase tracking-wider mt-1">{notif.time}</p>
                        </div>
                        {notif.type === 'follow' && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const follows = JSON.parse(localStorage.getItem('arena_follows') || '{}');
                                    const isCurrentlyFollowing = !!follows[notif.user];
                                    follows[notif.user] = !isCurrentlyFollowing;
                                    localStorage.setItem('arena_follows', JSON.stringify(follows));
                                    // Force re-render of notification panel
                                    setNotifications([...notifications]);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all ${
                                    JSON.parse(localStorage.getItem('arena_follows') || '{}')[notif.user] 
                                    ? 'bg-transparent border border-white/20 text-white/40' 
                                    : 'bg-[#ECA413] text-black shadow-lg shadow-[#ECA413]/20'
                                }`}
                            >
                                {JSON.parse(localStorage.getItem('arena_follows') || '{}')[notif.user] ? 'Seguindo' : 'Seguir'}
                            </button>
                        )}
                        {notif.postId && (
                             <span className="material-icons text-[#ECA413] text-sm">chevron_right</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
        </>
      )}

      <div className="py-4 overflow-x-auto hide-scrollbar whitespace-nowrap border-b border-white/5">
        <div className="flex gap-4 px-6">
          {STORY_GROUPS.map((story, index) => (
            <div key={story.id} className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                onClick={() => story.id !== '1' ? (() => { setActiveUserIndex(index); setActiveItemIndex(0); })() : onMediaCreation()}
                className={`relative w-[72px] h-[72px] rounded-full p-[2.5px] cursor-pointer active:scale-95 transition-transform ${story.hasNew ? 'bg-gradient-to-tr from-[#ECA413] via-[#8B4513] to-[#ECA413]' : 'bg-white/10'}`}
              >
                <div className="w-full h-full rounded-full border-[3px] border-background-dark overflow-hidden bg-neutral-800">
                  <img 
                    src={story.id === '1' ? (user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`) : story.avatar} 
                    className="w-full h-full object-cover" 
                    alt={story.username} 
                  />
                </div>
                {story.id === '1' && (
                  <div
                    className="absolute bottom-0 right-1 bg-[#ECA413] w-6 h-6 rounded-full border-[3px] border-background-dark flex items-center justify-center"
                  >
                    <span className="material-icons text-background-dark text-[16px] font-black">add</span>
                  </div>
                )}
              </div>
              <span 
                onClick={() => navigateToProfile(story.id === '1' ? (user?.username || 'meu-perfil') : story.username)}
                className={`text-[10px] font-bold tracking-tight cursor-pointer hover:underline ${story.hasNew ? 'text-white' : 'opacity-40 text-white'}`}
              >
                {story.id === '1' ? 'Meu Status' : story.username}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Posts Feed */}
      <main className="pb-12">
        {feedPosts.map((post) => (
          <article key={post.id} className="mb-2 last:mb-0 border-t border-white/5 pt-2">
            {/* Post Header */}
            <div className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                   onClick={() => navigateToProfile(post.username)}
                   className="w-10 h-10 rounded-full border border-[#ECA413]/30 p-0.5 cursor-pointer active:scale-95 transition-transform bg-neutral-800"
                >
                  <img className="w-full h-full object-cover rounded-full" src={post.avatarUrl || `https://ui-avatars.com/api/?name=${post.username}&background=random`} alt={post.username} />
                </div>
                <div>
                  <div className="flex items-center gap-1 cursor-pointer hover:underline" onClick={() => navigateToProfile(post.username)}>
                    <span className="font-black text-[13px] text-white tracking-tight">{post.username}</span>
                    {post.isVerified && <span className="material-icons text-[#ECA413] text-[14px]">verified</span>}
                  </div>
                  <div className="flex items-center gap-1 opacity-60">
                    <span className="material-icons text-[#ECA413] text-[10px]">place</span>
                    <span className="text-[9px] font-black text-white uppercase tracking-wider">{post.location}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedPostOptions(post);
                  setIsPostOptionsOpen(true);
                }}
                className="material-icons text-white/40 text-xl hover:text-white transition-colors"
              >
                more_vert
              </button>
            </div>

            {/* Post Media */}
            <div className="relative w-full overflow-hidden bg-neutral-900 group">
              <img
                className={`w-full ${post.id === '2' ? 'aspect-[4/5]' : 'aspect-square'} object-cover`}
                src={post.imageUrl}
                alt="Post content"
              />

              {post.isFeature && (
                <div className="absolute top-4 right-4 bg-background-dark/40 backdrop-blur-sm px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-[0.1em] border border-white/10 text-white/90">
                  DESTAQUE
                </div>
              )}

              {post.id === '2' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                    <span className="material-icons text-white text-4xl translate-x-0.5">play_arrow</span>
                  </div>
                </div>
              )}
            </div>

            {/* Interaction Bar */}
            <div className="px-5 py-4 flex justify-between items-center">
              <div className="flex gap-6 items-center">
                <button
                  onClick={() => handleLike(post.id)}
                  className="flex items-center gap-2 group active:scale-125 transition-transform"
                >
                  <span className={`material-icons text-[26px] ${likedPosts.has(post.id) ? 'text-red-500' : 'text-white'}`}>
                    {likedPosts.has(post.id) ? 'favorite' : 'favorite_border'}
                  </span>
                  <span className="text-[14px] font-black text-white/90 tracking-tight">
                    {likedPosts.has(post.id) ? (parseInt(post.likes.replace(/k/g, '000')) + 1).toLocaleString() : post.likes}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setActiveCommentsPost(post);
                    setIsCommentsOpen(true);
                    setPostComments([
                      { username: 'vitor_vaqueiro', text: 'Belo cavalo patrão, tá top! 🐎', time: '1h' },
                      { username: 'ana_montaria', text: 'Sensacional, próxima etapa a gente se vê.', time: '4h' }
                    ]);
                  }}
                  className="flex items-center gap-2"
                >
                  <span className="material-icons text-[24px] text-white">chat_bubble_outline</span>
                  <span className="text-[14px] font-black text-white/90 tracking-tight">{post.comments}</span>
                </button>
                <button onClick={() => handleShare(post)}>
                  <span className="material-icons text-[24px] text-white">send</span>
                </button>
              </div>

              <div className="flex items-center gap-4">
                {post.views && (
                  <span className="text-[11px] font-black text-[#ECA413] uppercase tracking-tighter">{post.views}</span>
                )}
                <button>
                  <span className="material-icons text-[24px] text-white/60">bookmark_border</span>
                </button>
              </div>
            </div>

            {/* Post Content */}
            <div className="px-5 pb-6 space-y-1.5">
              <div className="flex flex-wrap gap-2">
                {post.hashtags.map(tag => (
                  <span key={tag} className="text-[#ECA413] text-[11px] font-black uppercase tracking-wider">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-[13.5px] leading-snug">
                <span 
                  className="font-black mr-2 text-white cursor-pointer hover:underline"
                  onClick={() => navigateToProfile(post.username)}
                >
                  {post.username}
                </span>
                <span className="text-white/90 font-medium">{post.caption}</span>
              </p>
              <button
                onClick={() => {
                  setActiveCommentsPost(post);
                  setIsCommentsOpen(true);
                  setPostComments([
                    { username: 'vitor_vaqueiro', text: 'Belo cavalo patrão, tá top! 🐎', time: '1h' },
                    { username: 'ana_montaria', text: 'Sensacional, próxima etapa a gente se vê.', time: '4h' }
                  ]);
                }}
                className="text-[11px] font-black opacity-40 text-white uppercase tracking-widest block py-0.5 active:opacity-100"
              >
                VER TODOS OS {post.comments} COMENTÁRIOS
              </button>
              <div className="text-[9px] font-black opacity-30 text-white uppercase tracking-[0.15em]">{post.timeAgo}</div>
            </div>
          </article>
        ))}
      </main>

      {/* Coments Sliding Panel Overlay */}
      {isCommentsOpen && activeCommentsPost && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end animate-in slide-in-from-bottom duration-300 pointer-events-none">
            {/* Click to dismiss */}
            <div className="absolute inset-0 bg-black/60 pointer-events-auto" onClick={() => setIsCommentsOpen(false)}></div>
            
            <div className="bg-[#1C1C1E] h-[80vh] w-full rounded-t-3xl relative z-10 pointer-events-auto flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-white/5">
                <div className="flex justify-center p-3">
                    <div className="w-10 h-1 rounded-full bg-white/20"></div>
                </div>
                <div className="px-6 py-2 border-b border-white/5 text-center">
                    <h3 className="font-black text-xs text-white uppercase tracking-widest">Comentários</h3>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Caption / description block inside comments */}
                    <div className="flex gap-4 pb-6 border-b border-white/5">
                        <div className="w-8 h-8 rounded-full border border-white/10 shrink-0 overflow-hidden">
                            <img src={`https://picsum.photos/seed/${activeCommentsPost.username}/100`} />
                        </div>
                        <div>
                            <p className="text-[13px] text-white/90 leading-snug">
                                <span className="font-black mr-2 text-white">{activeCommentsPost.username}</span>
                                {activeCommentsPost.caption}
                            </p>
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-2 block">{activeCommentsPost.timeAgo}</span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {postComments.map((comment, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="w-8 h-8 rounded-full border border-white/10 shrink-0 overflow-hidden cursor-pointer" onClick={() => { setIsCommentsOpen(false); navigateToProfile(comment.username) }}>
                                    <img src={`https://picsum.photos/seed/${comment.username}/100`} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[13px] text-white/90 leading-snug">
                                        <span onClick={() => { setIsCommentsOpen(false); navigateToProfile(comment.username) }} className="font-black mr-2 text-white cursor-pointer">{comment.username}</span>
                                        {comment.text}
                                    </p>
                                    <div className="flex gap-4 items-center mt-1">
                                        <span className="text-[10px] font-bold text-white/40">{comment.time}</span>
                                        <button className="text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-white">Responder</button>
                                    </div>
                                </div>
                                <button className="material-icons text-[14px] text-white/20 hover:text-red-500 transition-colors">favorite_border</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-4 bg-background-dark/80 backdrop-blur-md border-t border-white/5 relative">
                    {/* Mention Suggestions UI */}
                    {showMentionSuggestions && (
                        <div className="absolute bottom-full left-0 right-0 bg-[#2C2C2E] border-t border-white/5 p-2 animate-in slide-in-from-bottom-2">
                             <p className="text-[9px] font-black uppercase text-white/40 tracking-widest mb-2 ml-2">Sugeridos</p>
                             <div className="flex gap-4 overflow-x-auto pb-2 px-2 hide-scrollbar">
                                {MOCK_USERS_FOR_MENTIONS.filter(u => u.includes(mentionQuery)).map(u => (
                                    <div 
                                        key={u} 
                                        onClick={() => insertMention(u)}
                                        className="flex flex-col items-center gap-1 cursor-pointer active:scale-90 transition-transform"
                                    >
                                        <div className="w-10 h-10 rounded-full border border-[#ECA413]/40 p-0.5">
                                             <img src={`https://picsum.photos/seed/${u}/100`} className="w-full h-full rounded-full object-cover" />
                                        </div>
                                        <span className="text-[9px] font-black text-white/80">@{u}</span>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-neutral-800 shrink-0 border border-white/10 overflow-hidden">
                            <img src="https://picsum.photos/seed/myAvatar/100" />
                        </div>
                        <div className="flex-1 bg-white/10 rounded-full flex items-center px-4 border border-white/10">
                            <input
                                value={commentText}
                                onChange={(e) => handleCommentChange(e.target.value)}
                                onKeyDown={e => {
                                    if(e.key === 'Enter' && commentText.trim()) {
                                        handlePostComment();
                                    }
                                }}
                                className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-white/40"
                                placeholder="Adicione um comentário..."
                            />
                        </div>
                        {commentText.trim() && (
                            <button onClick={handlePostComment} className="font-black text-[12px] text-[#ECA413] px-2 uppercase active:scale-95 transition-transform">
                                Publicar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Story Viewer Overlay */}
      {activeUserIndex !== null && (
        <div className="absolute inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300">
          {/* Progress Bars */}
          <div className="absolute top-4 left-0 right-0 px-2 flex gap-1 z-20">
            {STORY_GROUPS[activeUserIndex].items.map((_, i) => (
              <div key={i} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-50 ease-linear"
                  style={{
                    width: i < activeItemIndex ? '100%' : (i === activeItemIndex ? `${storyProgress}%` : '0%')
                  }}
                />
              </div>
            ))}
          </div>

          {/* Story Header */}
          <div className="absolute top-8 left-0 right-0 px-4 flex justify-between items-center z-20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-white/20 p-0.5">
                <img className="w-full h-full object-cover rounded-full" src={STORY_GROUPS[activeUserIndex].avatar} alt="" />
              </div>
              <span 
                  onClick={() => {
                    const username = STORY_GROUPS[activeUserIndex].username;
                    setActiveUserIndex(null);
                    navigateToProfile(username);
                  }}
                  className="text-white text-xs font-black uppercase tracking-widest drop-shadow-md cursor-pointer hover:underline"
                >
                {STORY_GROUPS[activeUserIndex].username}
              </span>
            </div>
            <button onClick={() => setActiveUserIndex(null)} className="material-icons text-white drop-shadow-md">close</button>
          </div>

          {/* Story Content */}
          <div className="flex-1 flex items-center justify-center bg-neutral-900">
            <img
              src={STORY_GROUPS[activeUserIndex].items[activeItemIndex].url}
              className="w-full max-h-full object-contain"
              alt="Story content"
            />
          </div>

          {/* Navigation Tap Zones */}
          <div className="absolute inset-x-0 top-20 bottom-20 flex z-10">
            <div className="flex-1" onClick={handlePrevStory}></div>
            <div className="flex-1" onClick={handleNextStory}></div>
          </div>

          {/* Story Footer */}
          <div className="absolute bottom-6 left-0 right-0 px-4 flex gap-4 items-center z-20">
            <div className="flex-1 h-12 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center px-4">
              <input
                className="bg-transparent border-none outline-none text-white text-xs w-full placeholder:text-white/40"
                placeholder="Enviar mensagem..."
                onFocus={() => { if (progressInterval.current) clearInterval(progressInterval.current); }}
                onBlur={() => {
                  progressInterval.current = setInterval(() => {
                    setStoryProgress(prev => {
                      if (prev >= 100) { handleNextStory(); return 100; }
                      return prev + 1;
                    });
                  }, 50);
                }}
              />
            </div>
            <button className="material-icons text-white drop-shadow-md">favorite_border</button>
            <button className="material-icons text-white drop-shadow-md" onClick={() => handleShare(INITIAL_POSTS[0])}>send</button>
          </div>
        </div>
      )}

      {/* Direct Messages Overlay */}
      {isDMScreenOpen && (
        <div className="fixed inset-0 z-[200] bg-background-dark flex flex-col animate-in slide-in-from-right duration-300">
          <header className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-background-dark/95 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <button onClick={() => { activeChatUser ? setActiveChatUser(null) : setIsDMScreenOpen(false); }} className="material-icons text-white">arrow_back</button>
              {activeChatUser && (
                <div onClick={() => { setActiveChatUser(null); setIsDMScreenOpen(false); navigateToProfile(activeChatUser) }} className="w-8 h-8 rounded-full border border-white/20 overflow-hidden shrink-0 cursor-pointer active:scale-95 transition-transform bg-neutral-800">
                  <img src={activeChatProfile?.avatar_url || `https://ui-avatars.com/api/?name=${activeChatUser}&background=random`} className="w-full h-full object-cover" alt="Avatar"/>
                </div>
              )}
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-white">
                  {activeChatUser ? activeChatUser : 'MENSAGENS'}
                </h3>
                {activeChatUser && <p className="text-[10px] font-bold text-[#ECA413] uppercase tracking-tight">Visto por último: há 10 min</p>}
              </div>
            </div>
            {!activeChatUser && (
              <button className="material-icons text-white">edit_square</button>
            )}
          </header>

          {!activeChatUser ? (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-2">
                  <span className="material-icons text-white/40">search</span>
                  <input type="text" value={dmSearchQuery} onChange={e => setDmSearchQuery(e.target.value)} placeholder="Buscar vaqueiro pelo nome ou @" className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-white/40" />
                </div>
              </div>
              
              {dmSearchQuery.length > 0 && dmSearchResults.length === 0 ? (
                <div className="text-center py-10 opacity-40">
                  <span className="material-icons text-4xl mb-2">person_search</span>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#ECA413]">Nenhum vaqueiro encontrado</p>
                </div>
              ) : Array.from(new Set(dmSearchQuery.length > 0 ? dmSearchResults.map(r => r.username) : messages.map(m => m.chatWith))).length === 0 ? (
                <div className="text-center py-10 opacity-40">
                  <span className="material-icons text-4xl mb-2">message</span>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Sua caixa está limpa.<br/>Busque alguém para papear!</p>
                </div>
              ) : (
                <>
                  <h4 className="px-6 py-2 text-[10px] font-black uppercase text-[#ECA413] tracking-widest">
                    {dmSearchQuery ? 'Resultados Encontrados' : 'Recentes'}
                  </h4>
                  {Array.from(new Set(dmSearchQuery.length > 0 ? dmSearchResults.map(r => r.username) : messages.map(m => m.chatWith))).map(user => {
                    const userMessages = messages.filter(m => m.chatWith === user);
                    const lastMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1] : {text: 'Tocar para conversar...', time: ''};
                    return (
                      <div key={user} onClick={() => { setActiveChatUser(user); setDmSearchQuery(''); }} className="px-6 py-4 flex items-center gap-4 border-b border-white/5 active:bg-white/5 cursor-pointer transition-colors">
                    <div className="w-14 h-14 rounded-full border border-white/10 overflow-hidden bg-neutral-800">
                      <img src={`https://picsum.photos/seed/${user}/100`} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-sm text-white mb-0.5">{user}</p>
                      <p className="text-xs font-medium text-white/60 truncate">{lastMessage.text}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold text-white/40">{lastMessage.time}</span>
                      {user === 'vitor_vaqueiro' && userMessages.length === 0 && <div className="w-2 h-2 rounded-full bg-[#ECA413]"></div>}
                    </div>
                  </div>
                );
              })}
              </>
            )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col bg-neutral-900/50 relative">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex justify-center mb-6">
                  <div className="bg-white/10 rounded-full px-3 py-1 text-[10px] font-bold text-white/60 uppercase">HOJE</div>
                </div>
                {messages.filter(m => m.chatWith === activeChatUser).map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${msg.sender === 'me' ? 'bg-[#ECA413] text-black rounded-tr-sm' : 'bg-white/10 text-white rounded-tl-sm'}`}>
                      <p className="font-medium text-[13px]">{msg.text}</p>
                      <p className={`text-[9px] font-black uppercase mt-1 text-right ${msg.sender === 'me' ? 'text-black/60' : 'text-white/40'}`}>{msg.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-background-dark border-t border-white/5 drop-shadow-2xl flex gap-2">
                <div className="flex-1 bg-white/10 rounded-full flex items-center px-4 border border-white/10">
                  <input 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newMessage.trim() && activeChatUser) {
                        setMessages([...messages, { sender: 'me', text: newMessage, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), chatWith: activeChatUser }]);
                        setNewMessage('');
                      }
                    }}
                    placeholder="Mensagem..." 
                    className="w-full bg-transparent text-sm py-3 outline-none font-medium placeholder:text-white/40"
                  />
                </div>
                {newMessage.trim() ? (
                  <button 
                    onClick={() => {
                      if (activeChatUser) {
                        setMessages([...messages, { sender: 'me', text: newMessage, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), chatWith: activeChatUser }]);
                        setNewMessage('');
                      }
                    }}
                    className="w-12 h-12 rounded-full bg-[#ECA413] flex items-center justify-center text-black shadow-lg"
                  >
                    <span className="material-icons text-[20px]">send</span>
                  </button>
                ) : (
                  <button className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/60">
                    <span className="material-icons text-[20px]">mic</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {/* Overlay de Busca de Usuários */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] bg-background-dark animate-in fade-in slide-in-from-bottom duration-300 flex flex-col">
          <header className="px-6 py-4 flex items-center gap-4 border-b border-white/5 sticky top-0 bg-background-dark/95 backdrop-blur-md">
            <button onClick={() => setIsSearchOpen(false)} className="material-icons text-white/40 hover:text-white transition-colors">arrow_back</button>
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons text-[#ECA413] text-lg">search</span>
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar vaqueiro pelo @username..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-white/20 outline-none focus:border-[#ECA413] transition-all text-sm"
              />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {searchQuery.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">Resultados Encontrados</h3>
                {searchQueryResult.map(userResult => (
                  <div 
                    key={userResult.username} 
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery('');
                      setSearchQueryResult([]);
                      navigateToProfile(userResult.username);
                    }}
                    className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl active:scale-[0.98] transition-all cursor-pointer hover:bg-white/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full border border-[#ECA413]/30 p-0.5">
                        <img src={userResult.avatar_url || `https://ui-avatars.com/api/?name=${userResult.name}&background=random`} className="w-full h-full rounded-full object-cover" alt={userResult.name} />
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm tracking-tight">{userResult.name}</p>
                        <p className="text-[#ECA413] text-[10px] uppercase font-black tracking-widest">@{userResult.username}</p>
                      </div>
                    </div>
                    <span className="material-icons text-white/20">chevron_right</span>
                  </div>
                ))}
                
                {searchQuery.length > 0 && searchQuery.length < 3 && (
                  <p className="text-center text-[10px] text-white/20 uppercase tracking-widest pt-4 italic">
                    Continue digitando para refinar...
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 opacity-20 space-y-4">
                <span className="material-icons text-6xl">person_search</span>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-center">Digite o nome ou @username <br/> para encontrar vaqueiros</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Modal de Opções do Post */}
      {isPostOptionsOpen && selectedPostOptions && (
        <div className="fixed inset-0 z-[300] flex flex-col justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsPostOptionsOpen(false)}></div>
          <div className="bg-[#1C1C1E] rounded-t-3xl relative z-10 w-full p-6 pb-12 space-y-4 animate-in slide-in-from-bottom duration-300 border-t border-white/5">
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-white/20"></div>
            </div>

            <button 
              onClick={() => { alert('Post salvo nos favoritos!'); setIsPostOptionsOpen(false); }}
              className="w-full flex items-center gap-4 py-4 px-4 bg-white/5 rounded-2xl active:scale-[0.98] transition-all"
            >
              <span className="material-icons text-white/60">bookmark_border</span>
              <span className="text-sm font-bold text-white">Salvar como favorito</span>
            </button>

            <button 
              onClick={() => { alert(`Você deixou de seguir ${selectedPostOptions.username}`); setIsPostOptionsOpen(false); }}
              className="w-full flex items-center gap-4 py-4 px-4 bg-white/5 rounded-2xl active:scale-[0.98] transition-all"
            >
              <span className="material-icons text-red-500/60">person_remove</span>
              <span className="text-sm font-bold text-red-500">Deixar de seguir</span>
            </button>

            <button 
              onClick={() => { setIsPostOptionsOpen(false); setIsAboutAccountOpen(true); }}
              className="w-full flex items-center gap-4 py-4 px-4 bg-white/5 rounded-2xl active:scale-[0.98] transition-all"
            >
              <span className="material-icons text-white/60">info_outline</span>
              <span className="text-sm font-bold text-white">Sobre esta conta</span>
            </button>

            <button 
               onClick={() => { alert('Post denunciado. Obrigado pelo feedback.'); setIsPostOptionsOpen(false); }}
               className="w-full flex items-center gap-4 py-4 px-4 bg-white/5 rounded-2xl active:scale-[0.98] transition-all"
            >
              <span className="material-icons text-red-500/60">report_gmailerrorred</span>
              <span className="text-sm font-bold text-red-500">Denunciar</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal Sobre esta Conta */}
      {isAboutAccountOpen && selectedPostOptions && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-background-dark/95 backdrop-blur-xl" onClick={() => setIsAboutAccountOpen(false)}></div>
          <div className="bg-[#1C1C1E] rounded-[32px] relative z-10 w-full max-w-sm p-8 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-24 h-24 rounded-full border-4 border-[#ECA413] p-1 bg-background-dark">
                <img 
                   src={`https://picsum.photos/seed/${selectedPostOptions.username}/200`} 
                   className="w-full h-full rounded-full object-cover" 
                   alt="Profile"
                />
              </div>
              
              <div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">{selectedPostOptions.username}</h3>
                <p className="text-[#ECA413] text-[10px] font-black uppercase tracking-widest mt-1">Vaqueiro Verificado</p>
              </div>

              <div className="w-full pt-6 space-y-4 border-t border-white/5">
                <div className="flex justify-between items-center text-left">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Data de Entrada</span>
                  <span className="text-xs font-bold text-white">Março de 2024</span>
                </div>
                <div className="flex justify-between items-center text-left">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Cidade Situada</span>
                  <span className="text-xs font-bold text-white">Campina Grande, PB</span>
                </div>
                <div className="flex justify-between items-center text-left">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Status da Conta</span>
                  <span className="text-xs font-bold text-green-400">Ativo / Regular</span>
                </div>
              </div>

              <button 
                onClick={() => setIsAboutAccountOpen(false)}
                className="w-full bg-white/5 hover:bg-white/10 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] transition-all mt-4 border border-white/5"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Search Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[1000] bg-background-dark/95 backdrop-blur-xl animate-in fade-in zoom-in duration-300 flex flex-col pt-12">
            <header className="px-6 flex items-center gap-4 mb-8">
                <div className="flex-1 bg-white/10 rounded-2xl flex items-center px-6 py-4 border border-white/10 group focus-within:border-[#ECA413] transition-all">
                    <span className="material-icons text-[#ECA413] mr-3">search</span>
                    <input 
                        autoFocus
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Pesquisar por @apelido..."
                        className="bg-transparent border-none outline-none text-white w-full font-bold placeholder:text-white/20"
                    />
                </div>
                <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="text-white/40 font-black text-[10px] uppercase tracking-widest px-2">Fechar</button>
            </header>

            <div className="flex-1 px-6 space-y-4 overflow-y-auto pb-10">
                {searchQueryResult.length > 0 ? (
                    searchQueryResult.map(res => (
                        <div 
                            key={res.id} 
                            onClick={() => { navigateToProfile(res.username); setIsSearchOpen(false); }}
                            className="bg-white/5 border border-white/5 rounded-[24px] p-4 flex items-center gap-4 active:scale-95 transition-all cursor-pointer"
                        >
                            <div className="w-12 h-12 rounded-full border border-[#ECA413]/30 p-0.5">
                                <img src={res.avatar_url || `https://ui-avatars.com/api/?name=${res.full_name}&background=random`} className="w-full h-full rounded-full object-cover" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-white font-black text-sm tracking-tight">{res.full_name}</h4>
                                <p className="text-[#ECA413] text-[10px] font-black uppercase tracking-widest">@{res.username}</p>
                            </div>
                            <span className="material-icons text-white/20">arrow_forward_ios</span>
                        </div>
                    ))
                ) : searchQuery.length >= 2 ? (
                    <div className="text-center py-10 opacity-40">
                        <span className="material-icons text-4xl mb-2">face</span>
                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhum vaqueiro encontrado</p>
                    </div>
                ) : (
                    <div className="text-center py-10 opacity-20">
                        <p className="text-[10px] font-black uppercase tracking-widest">Digite o apelido para buscar</p>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default SocialFeedView;
