import React, { useState, useEffect, useRef } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

import { Capacitor } from '@capacitor/core';

// Detecta se o dispositivo é touch (mobile/tablet nativo)
const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children, className }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const PULL_THRESHOLD = 80;
  const MAX_PULL = 120;

  const pullDistanceRef = useRef(0);
  const isRefreshingRef = useRef(false);

  // No web desktop, renderiza como wrapper transparente sem bloquear scroll
  const isTouch = isTouchDevice();

  useEffect(() => {
    if (!isTouch) return; // Desabilita lógica PTR no desktop web
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
      const isAndroid = Capacitor.getPlatform() === 'android';
      const currentScrollTop = isAndroid ? (el.scrollTop || window.scrollY || document.documentElement.scrollTop) : el.scrollTop;
      pulling = currentScrollTop <= 0;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pulling || isRefreshingRef.current || horizontalScroll) return;

      const currentY = e.touches[0].pageY;
      const currentX = e.touches[0].pageX;
      const diffY = currentY - touchStartY;
      const diffX = currentX - touchStartX;

      if (!horizontalScroll && Math.abs(diffX) > Math.abs(diffY)) {
        horizontalScroll = true;
        pulling = false;
        setPullDistance(0);
        pullDistanceRef.current = 0;
        return;
      }

      const isAndroid = Capacitor.getPlatform() === 'android';
      const currentScrollTop = isAndroid ? (el.scrollTop || window.scrollY || document.documentElement.scrollTop) : el.scrollTop;

      if (diffY > 5 && currentScrollTop <= 0) {
        if (!isAndroid && e.cancelable) e.preventDefault();
        const pull = Math.min((diffY - 5) * 0.4, MAX_PULL);
        setPullDistance(pull);
        pullDistanceRef.current = pull;
      } else if (diffY < 0) {
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

    const isAndroid = Capacitor.getPlatform() === 'android';
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: isAndroid });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, isTouch]);

  // ── Web Desktop: wrapper simples, sem overflow/altura bloqueante ──
  if (!isTouch) {
    return (
      <div className={`w-full ${className ?? ''}`}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-y-auto flex-1 w-full hide-scrollbar flex flex-col ${className ?? ''}`}
      style={{
        overscrollBehaviorY: 'auto', 
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y', 
      }}
    >
      {/* Pull Indicator */}
      <div
        className="absolute left-0 right-0 flex justify-center pointer-events-none z-50 transition-transform duration-200"
        style={{
          transform: `translateY(${pullDistance - 40}px)`,
          opacity: pullDistance > 10 ? 1 : 0,
          willChange: 'transform',
        }}
      >
        <div className="bg-[#1A1108] border border-[#ECA413]/30 w-10 h-10 rounded-full flex items-center justify-center shadow-2xl">
          <div
            className={`w-5 h-5 border-2 border-[#ECA413] border-t-transparent rounded-full ${isRefreshing ? 'animate-spin' : ''}`}
            style={{
              transform: !isRefreshing ? `rotate(${pullDistance * 3}deg)` : 'none',
              transition: isRefreshing ? 'none' : 'transform 0.1s',
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${pullDistance}px)`,
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
};
