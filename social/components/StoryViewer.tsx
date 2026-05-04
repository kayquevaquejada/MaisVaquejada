import React, { useState, useEffect, useRef } from 'react';
import { Story } from '../types';

interface StoryViewerProps {
  stories: (Story & { isAd?: boolean; campaign?: any })[];
  initialUserIndex: number;
  onClose: () => void;
  onNavigateToProfile: (username: string) => void;
  onShare: (post: any) => void;
  onDelete?: (storyId: string) => void;
  onAdClick?: (campaign: any) => void;
  onAdImpression?: (campaignId: string) => void;
  currentUserId?: string;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({
  stories,
  initialUserIndex,
  onClose: handleCloseStory,
  onNavigateToProfile,
  onShare,
  onDelete,
  onAdClick,
  onAdImpression,
  currentUserId
}) => {
  const [activeUserIndex, setActiveUserIndex] = useState(initialUserIndex);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // Swipe-down state
  const touchStartY = useRef<number>(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const currentUser = stories[activeUserIndex];
  const currentItem = currentUser?.items[activeItemIndex];

  const handleNextStory = () => {
    if (activeItemIndex < currentUser.items.length - 1) {
      setActiveItemIndex(activeItemIndex + 1);
      setStoryProgress(0);
    } else if (activeUserIndex < stories.length - 1) {
      setActiveUserIndex(activeUserIndex + 1);
      setActiveItemIndex(0);
      setStoryProgress(0);
    } else {
      handleCloseStory();
    }
  };

  const handlePrevStory = () => {
    if (activeItemIndex > 0) {
      setActiveItemIndex(activeItemIndex - 1);
      setStoryProgress(0);
    } else if (activeUserIndex > 0) {
      const prevUserIndex = activeUserIndex - 1;
      setActiveUserIndex(prevUserIndex);
      setActiveItemIndex(stories[prevUserIndex].items.length - 1);
      setStoryProgress(0);
    } else {
      handleCloseStory();
    }
  };

  useEffect(() => {
    if (currentUser && currentItem && !isPaused) {
      if (currentUser.isAd && onAdImpression) {
        onAdImpression(currentUser.campaign.id);
      }
      progressInterval.current = setInterval(() => {
        setStoryProgress(prev => {
          if (prev >= 100) {
            handleNextStory();
            return 100;
          }
          return prev + 1;
        });
      }, currentUser.isAd ? 100 : 50);
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current);
    }
    return () => { if (progressInterval.current) clearInterval(progressInterval.current); };
  }, [activeUserIndex, activeItemIndex, isPaused, currentUser, currentItem, onAdImpression]);

  // Swipe-down & Pause handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
    setIsPaused(true); // PAUSE ON TOUCH
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 0) setDragY(deltaY); // Only allow downward drag
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setIsPaused(false); // RESUME ON RELEASE
    
    if (dragY > 120) {
      handleCloseStory();
    } else {
      setDragY(0);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffInMs = now.getTime() - past.getTime();
      const diffInMins = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

      if (diffInMins < 1) return 'agora';
      if (diffInMins < 60) return `${diffInMins} m`;
      return `${diffInHours} h`;
    } catch (e) {
      return '';
    }
  };

  const [replyText, setReplyText] = useState('');
  const [likedStories, setLikedStories] = useState<Set<string>>(new Set());

  const handleToggleLike = () => {
    if (!currentItem) return;
    setLikedStories(prev => {
      const next = new Set(prev);
      if (next.has(currentItem.id)) next.delete(currentItem.id);
      else next.add(currentItem.id);
      return next;
    });
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !currentUser) return;
    onShare({
      type: 'story_reply',
      username: currentUser.username.replace('@', ''),
      mediaUrl: currentItem.url,
      text: replyText.trim(),
      targetUserId: currentUser.id
    });
    setReplyText('');
    setStoryProgress(0); // Resume
    setIsPaused(false);
  };

  const handleDelete = () => {
    if (!currentItem || !onDelete) return;
    if (confirm('Deseja excluir este story permanentemente?')) {
      onDelete(currentItem.id);
    }
  };

  if (!currentUser || !currentItem) return null;

  const opacity = Math.max(0.3, 1 - dragY / 400);
  const isLiked = likedStories.has(currentItem.id);

  return (
    <div
      className="fixed inset-0 z-[500] bg-black flex flex-col pointer-events-auto select-none touch-none"
      style={{
        transform: `translateY(${dragY}px)`,
        opacity,
        transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.32,0.72,0,1), opacity 0.3s ease',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Progress Bars */}
      <div className="absolute top-4 left-0 right-0 px-2 flex gap-1 z-20">
        {currentUser.items.map((_, i) => (
          <div key={i} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white"
              style={{
                width: i < activeItemIndex ? '100%' : (i === activeItemIndex ? `${storyProgress}%` : '0%'),
                transition: i === activeItemIndex ? 'width 0.1s linear' : 'none'
              }}
            />
          </div>
        ))}
      </div>

      {/* Story Header */}
      <div className="absolute top-8 left-0 right-0 px-4 flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-white/20 p-0.5">
            <img className="w-full h-full object-cover rounded-full" src={currentUser.avatar} alt="" />
          </div>
          <div className="flex items-center gap-2">
            <span
              onClick={() => currentUser.isAd ? null : onNavigateToProfile(currentUser.username)}
              className="text-white text-xs font-black uppercase tracking-widest drop-shadow-md cursor-pointer hover:underline"
            >
              {currentUser.username}
            </span>
            {!currentUser.isAd && (
              <span className="text-white/60 text-[10px] font-bold drop-shadow-md">
                • {formatRelativeTime(currentItem.created_at)}
              </span>
            )}
            {currentUser.isAd && (
              <span className="text-[8px] bg-[#ECA413] text-background-dark font-black tracking-widest uppercase px-1.5 py-0.5 rounded shadow">Patrocinado</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {currentUser.id === currentUserId && !currentUser.isAd && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleDelete(); }} 
              className="material-icons text-red-500 drop-shadow-md active:scale-90 transition-transform"
            >
              delete_outline
            </button>
          )}
          <button onClick={handleCloseStory} className="material-icons text-white drop-shadow-md">close</button>
        </div>
      </div>

      {/* Swipe hint */}
      {dragY > 30 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <div className="bg-white/20 backdrop-blur-md text-white text-xs font-black uppercase tracking-widest px-5 py-2.5 rounded-full shadow-xl">
            Solte para fechar
          </div>
        </div>
      )}

      {/* Story Content — Full screen cover */}
      <div 
        className="absolute inset-0 select-none flex items-center justify-center bg-black overflow-hidden"
        onContextMenu={(e) => e.preventDefault()}
      >
        <img
          src={currentItem.url}
          className="w-full transition-transform duration-100 ease-out"
          style={{
            transform: `translate(${(currentItem as any).offset_x || 0}px, ${(currentItem as any).offset_y || 0}px) scale(${(currentItem as any).zoom || 1})`,
            aspectRatio: (currentItem as any).aspect_ratio === '1:1' ? '1/1' : (currentItem as any).aspect_ratio === '4:5' ? '4/5' : (currentItem as any).aspect_ratio === '16:9' ? '16/9' : 'auto',
            objectFit: ((currentItem as any).aspect_ratio && (currentItem as any).aspect_ratio !== 'original') ? 'cover' : 'contain',
            maxHeight: '100%',
            width: '100%'
          }}
          alt="Story content"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />
      </div>

      {/* Navigation Tap Zones */}
      <div className="absolute inset-x-0 top-20 bottom-20 flex z-10">
        <div className="flex-1" onClick={handlePrevStory}></div>
        <div className="flex-1" onClick={handleNextStory}></div>
      </div>

      {/* Story Footer */}
      {!currentUser.isAd ? (
        <div className="absolute bottom-6 left-0 right-0 px-4 flex gap-4 items-center z-20">
          <div className="flex-1 h-12 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center px-4">
            <input
              className="bg-transparent border-none outline-none text-white text-base w-full placeholder:text-white/40 select-text py-1"
              placeholder="Enviar mensagem..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
            />
          </div>
          <button 
            onClick={handleToggleLike}
            className={`material-icons drop-shadow-md transition-all active:scale-125 ${isLiked ? 'text-red-500' : 'text-white'}`}
          >
            {isLiked ? 'favorite' : 'favorite_border'}
          </button>
          <button 
            className="material-icons text-white drop-shadow-md active:scale-110 transition-transform" 
            onClick={handleSendReply}
          >
            send
          </button>
        </div>
      ) : (
        <div className="absolute bottom-8 left-0 right-0 px-6 z-20">
          <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-3xl mb-4">
            <h3 className="text-white font-black uppercase text-sm mb-1">{currentUser.campaign.public_title}</h3>
            {currentUser.campaign.description && (
               <p className="text-white/70 text-xs font-medium mb-3">{currentUser.campaign.description}</p>
            )}
            <button
              onClick={() => onAdClick && onAdClick(currentUser.campaign)}
              className="w-full bg-[#ECA413] text-background-dark py-3 rounded-xl font-black tracking-widest uppercase text-xs flex items-center justify-center gap-2"
            >
              <span className="material-icons text-[18px]">touch_app</span>
              {currentUser.campaign.cta_text || 'Acessar Agora'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

