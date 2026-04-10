import React, { useState, useEffect, useRef } from 'react';
import { Story } from '../types';

interface StoryViewerProps {
  stories: (Story & { isAd?: boolean; campaign?: any })[];
  initialUserIndex: number;
  onClose: () => void;
  onNavigateToProfile: (username: string) => void;
  onShare: (post: any) => void;
  onAdClick?: (campaign: any) => void;
  onAdImpression?: (campaignId: string) => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({
  stories,
  initialUserIndex,
  onClose,
  onNavigateToProfile,
  onShare,
  onAdClick,
  onAdImpression
}) => {
  const [activeUserIndex, setActiveUserIndex] = useState(initialUserIndex);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // Swipe-down state
  const touchStartY = useRef<number>(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

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
      onClose();
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
      onClose();
    }
  };

  useEffect(() => {
    if (currentUser && currentItem) {
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
    }
    return () => { if (progressInterval.current) clearInterval(progressInterval.current); };
  }, [activeUserIndex, activeItemIndex]);

  // Swipe-down handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
    if (progressInterval.current) clearInterval(progressInterval.current);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 0) setDragY(deltaY); // Only allow downward drag
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 120) {
      onClose();
    } else {
      setDragY(0);
    }
  };

  if (!currentUser || !currentItem) return null;

  const opacity = Math.max(0.3, 1 - dragY / 400);

  return (
    <div
      className="fixed inset-0 z-[500] bg-black flex flex-col pointer-events-auto"
      style={{
        transform: `translateY(${dragY}px)`,
        opacity,
        transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.32,0.72,0,1), opacity 0.3s ease',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
          <div className="flex flex-col">
            <span
              onClick={() => currentUser.isAd ? null : onNavigateToProfile(currentUser.username)}
              className="text-white text-xs font-black uppercase tracking-widest drop-shadow-md cursor-pointer hover:underline flex items-center gap-2"
            >
              {currentUser.username}
            </span>
            {currentUser.isAd && (
              <span className="text-[8px] bg-[#ECA413] text-background-dark font-black tracking-widest uppercase px-1.5 py-0.5 rounded shadow">Patrocinado</span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="material-icons text-white drop-shadow-md">close</button>
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
      <div className="absolute inset-0">
        <img
          src={currentItem.url}
          className="w-full h-full object-cover"
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
          <button className="material-icons text-white drop-shadow-md" onClick={() => onShare(currentItem)}>send</button>
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
