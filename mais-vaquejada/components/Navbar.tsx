import React, { useState } from 'react';
import { View } from '../types';

interface NavbarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  user: any;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onViewChange, user }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleNav = (view: View) => {
    onViewChange(view);
  };

  const handleCenterClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    } else {
      handleNav(View.EVENTS);
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

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center">
        {/* Container Principal Expandível */}
        <div
          className={`relative flex items-center justify-center transition-all duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.275) ${isExpanded
            ? 'w-[320px] h-[72px] rounded-[24px] bg-[#0F0A05]/95 backdrop-blur-3xl border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,1)]'
            : 'w-[64px] h-[64px] rounded-full bg-[#1A1108] border border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.8)]'
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
              ? 'bg-gradient-to-br from-[#ECA413] via-[#B47B09] to-[#8B4513] text-white shadow-[#ECA413]/40 shadow-2xl'
              : 'bg-neutral-800 border border-white/5 text-white/40'
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
