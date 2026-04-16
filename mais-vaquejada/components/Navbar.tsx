import React, { useState, useEffect, useRef } from 'react';
import { View } from '../types';

interface NavbarProps {
  currentView: View;
  user: any;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, user }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMouseOver, setIsMouseOver] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const lastScrollY = useRef(0);
  const scrollingTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (isExpanded) return;

      setIsScrolling(true);
      
      if (scrollingTimeout.current) clearTimeout(scrollingTimeout.current);
      scrollingTimeout.current = setTimeout(() => {
        setIsScrolling(false);
      }, 1000);
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('wheel', handleScroll, { passive: true });
    window.addEventListener('touchmove', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('wheel', handleScroll);
      window.removeEventListener('touchmove', handleScroll);
      if (scrollingTimeout.current) clearTimeout(scrollingTimeout.current);
    };
  }, [isExpanded]);

  // When mouse enters, stop scrolling effects
  const handleMouseEnter = () => {
    setIsMouseOver(true);
  };

  const handleNav = (view: View) => {
    window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view } }));
    setIsExpanded(false);
  };

  const handleCenterClick = () => {
    if (!isExpanded) {
      setIsExpanded(true); // 1º clique: expande o menu
    } else {
      handleNav(View.EVENTS); // 2º clique: vai para o Home (handleNav já fecha o menu)
    }
  };

  return (
    <>
      {/* Backdrop Cinematic para fechar ao clicar fora */}
      <div
        onClick={() => setIsExpanded(false)}
        className={`fixed inset-0 z-[90] ${isExpanded ? 'bg-black/20 pointer-events-auto opacity-100' : 'bg-transparent pointer-events-none opacity-0'
          } transition-all duration-300`}
      />

      <div 
        className={`fixed left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center transition-all duration-700 bottom-8 ${
          isScrolling && !isExpanded && !isMouseOver ? 'opacity-10 scale-90 translate-y-4' : 'opacity-100 scale-100 translate-y-0'
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsMouseOver(false)}
      >
        {/* Container Principal Expandível */}
        <div
          className={`relative flex items-center justify-center transition-all duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.275) ${isExpanded
            ? 'w-[320px] h-[72px] rounded-[24px] bg-[#0F0A05]/80 backdrop-blur-3xl border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.8)]'
            : 'w-[64px] h-[64px] rounded-full bg-white/5 backdrop-blur-md border border-white/10 shadow-lg'
            }`}
        >

          {/* Lado Esquerdo (Icons saindo da bolinha) */}
          <div className={`absolute left-6 flex items-center gap-8 transition-all duration-500 ${isExpanded ? 'opacity-100 translate-x-0 scale-100 delay-100' : 'opacity-0 translate-x-12 scale-50 pointer-events-none'
            }`}>
            <button
              onClick={() => handleNav(View.MERCADO)}
              className={`material-icons text-2xl transition-all duration-300 ${currentView === View.MERCADO ? 'text-[#ECA413] scale-110' : 'text-white opacity-30 hover:opacity-100'}`}
            >
              storefront
            </button>
            <button
              onClick={() => handleNav(View.SOCIAL)}
              className={`material-icons text-2xl transition-all duration-300 ${currentView === View.SOCIAL ? 'text-[#ECA413] scale-110' : 'text-white opacity-30 hover:opacity-100'}`}
            >
              pets
            </button>
          </div>

          {/* Central Home "Bolinha" (O Gatilho e Botão Home) */}
          <button
            onClick={handleCenterClick}
            className={`relative z-10 w-[56px] h-[56px] rounded-full flex items-center justify-center transition-all duration-500 active:scale-90 ${currentView === View.EVENTS
              ? 'bg-gradient-to-br from-[#ECA413] via-[#B47B09] to-[#8B4513] text-white shadow-[#ECA413]/40'
              : 'bg-white/10 backdrop-blur-md border border-white/5 text-white/40'
              }`}
          >
            <span className={`material-icons text-3xl transition-transform duration-500 ${isExpanded ? 'rotate-[360deg]' : ''}`}>
              home
            </span>
          </button>

          {/* Lado Direito (Icons saindo da bolinha) */}
          <div className={`absolute right-6 flex items-center gap-8 transition-all duration-500 ${isExpanded ? 'opacity-100 translate-x-0 scale-100 delay-100' : 'opacity-0 -translate-x-12 scale-50 pointer-events-none'
            }`}>
            <button
              onClick={() => handleNav(View.NEWS)}
              className={`material-icons text-2xl transition-all duration-300 ${currentView === View.NEWS ? 'text-[#ECA413] scale-110' : 'text-white opacity-30 hover:opacity-100'}`}
            >
              campaign
            </button>
            <button
              onClick={() => handleNav(View.PROFILE)}
              className={`w-8 h-8 rounded-full border-2 transition-all overflow-hidden flex items-center justify-center ${currentView === View.PROFILE ? 'border-[#ECA413]' : 'border-white/10 opacity-30 hover:opacity-100'
                }`}
            >
              <img src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`} className="w-full h-full object-cover" alt="" />
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default Navbar;
