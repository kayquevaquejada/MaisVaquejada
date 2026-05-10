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

  const pullDistanceRef = useRef(0);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let touchStartY = 0;
    let touchStartX = 0;
    let pulling = false;
    let horizontalScroll = false;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].pageY;
      touchStartX = e.touches[0].pageX;
      horizontalScroll = false;
      
      if (el.scrollTop <= 0) {
        pulling = true;
      } else {
        pulling = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pulling || isRefreshingRef.current || horizontalScroll) return;

      const currentY = e.touches[0].pageY;
      const currentX = e.touches[0].pageX;
      const diffY = currentY - touchStartY;
      const diffX = currentX - touchStartX;

      // Detect horizontal scroll attempt
      if (!horizontalScroll && Math.abs(diffX) > Math.abs(diffY)) {
        horizontalScroll = true;
        pulling = false;
        setPullDistance(0);
        pullDistanceRef.current = 0;
        return;
      }

      if (diffY > 5 && el.scrollTop <= 0) {
        // We are at the top and pulling down with a small threshold
        if (e.cancelable) e.preventDefault();
        
        const pull = Math.min((diffY - 5) * 0.4, MAX_PULL);
        setPullDistance(pull);
        pullDistanceRef.current = pull;
      } else if (diffY < 0) {
        // Scrolling up, stop PTR logic
        pulling = false;
        if (pullDistanceRef.current > 0) {
          setPullDistance(0);
          pullDistanceRef.current = 0;
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!pulling || isRefreshingRef.current || horizontalScroll) {
        pulling = false;
        setPullDistance(0);
        pullDistanceRef.current = 0;
        return;
      }
      pulling = false;

      if (pullDistanceRef.current >= PULL_THRESHOLD) {
        setIsRefreshing(true);
        isRefreshingRef.current = true;
        setPullDistance(PULL_THRESHOLD);
        pullDistanceRef.current = PULL_THRESHOLD;
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          isRefreshingRef.current = false;
          setPullDistance(0);
          pullDistanceRef.current = 0;
        }
      } else {
        setPullDistance(0);
        pullDistanceRef.current = 0;
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh]);

  return (
    <div 
      ref={containerRef} 
      className={`relative overflow-y-auto h-full w-full hide-scrollbar ${className}`}
      style={{ 
        overscrollBehaviorY: 'none',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* Pull Indicator */}
      <div 
        className="absolute left-0 right-0 flex justify-center pointer-events-none z-50 transition-transform duration-200"
        style={{ 
          transform: `translateY(${pullDistance - 40}px)`,
          opacity: pullDistance > 10 ? 1 : 0,
          willChange: 'transform'
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
        style={{ 
          transform: `translateY(${pullDistance}px)`,
          willChange: 'transform'
        }}
      >
        {children}
      </div>
    </div>
  );
};
