import React, { useState, useEffect, useRef } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children, className }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const PULL_THRESHOLD = 80;
  const MAX_PULL = 120;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Só inicia o pull se estiver no topo do scroll
      if (el.scrollTop <= 0) {
        startY.current = e.touches[0].pageY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;

      const currentY = e.touches[0].pageY;
      const diff = currentY - startY.current;

      if (diff > 0) {
        // Prevent default scroll when pulling down at the top
        if (el.scrollTop <= 0) {
          if (e.cancelable) e.preventDefault();
          const pull = Math.min(diff * 0.5, MAX_PULL);
          setPullDistance(pull);
        }
      } else {
        isPulling.current = false;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling.current || isRefreshing) return;
      isPulling.current = false;

      if (pullDistance >= PULL_THRESHOLD) {
        setIsRefreshing(true);
        setPullDistance(PULL_THRESHOLD);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, isRefreshing, onRefresh]);

  return (
    <div 
      ref={containerRef} 
      className={`relative overflow-y-auto h-full w-full hide-scrollbar ${className}`}
    >
      {/* Pull Indicator */}
      <div 
        className="absolute left-0 right-0 flex justify-center pointer-events-none z-50 transition-transform duration-200"
        style={{ 
          transform: `translateY(${pullDistance - 40}px)`,
          opacity: pullDistance > 10 ? 1 : 0
        }}
      >
        <div className="bg-[#1A1108] border border-[#ECA413]/30 w-10 h-10 rounded-full flex items-center justify-center shadow-2xl">
          <div className={`w-5 h-5 border-2 border-[#ECA413] border-t-transparent rounded-full ${isRefreshing ? 'animate-spin' : ''}`} 
               style={{ 
                 transform: !isRefreshing ? `rotate(${pullDistance * 3}deg)` : 'none',
                 transition: isRefreshing ? 'none' : 'transform 0.1s'
               }} 
          />
        </div>
      </div>

      {/* Content */}
      <div 
        className="transition-transform duration-200"
        style={{ transform: `translateY(${pullDistance}px)` }}
      >
        {children}
      </div>
    </div>
  );
};
