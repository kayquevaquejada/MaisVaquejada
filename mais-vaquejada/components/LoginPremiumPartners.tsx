import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Partner {
  id: string;
  nome_empresa: string;
  logo_url: string;
  link_url: string;
  tipo: 'patrocinador' | 'parceiro' | 'apoiador';
  ativo: boolean;
  ordem: number;
  destaque: boolean;
}

const LoginPremiumPartners: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pauseTimeout = useRef<any>(null);
  const animationFrameId = useRef<any>(null);
  const lastTime = useRef<number>(0);
  const scrollPos = useRef<number>(0);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('parceiros_login')
        .select('*')
        .eq('ativo', true)
        .lte('data_inicio', now)
        .or(`data_fim.is.null,data_fim.gte.${now}`)
        .order('destaque', { ascending: false })
        .order('tipo', { ascending: true })
        .order('ordem', { ascending: true });

      if (error) throw error;
      setPartners(data || []);
    } catch (err) {
      console.error('Error fetching login partners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (partners.length === 0) return;

    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const speed = 0.05; // Pixels per ms (approx 50px per second)
    
    const animate = (time: number) => {
      if (!lastTime.current) lastTime.current = time;
      const deltaTime = time - lastTime.current;
      lastTime.current = time;

      if (!isPaused && scrollContainer) {
        // Check if any highlight is centered
        const center = scrollContainer.offsetWidth / 2;
        const items = scrollContainer.querySelectorAll('button');
        let shouldPause = false;

        items.forEach((item) => {
          // If it's a highlighted item
          if (item.classList.contains('mx-6')) { // mx-6 is only on highlights
            const rect = item.getBoundingClientRect();
            const containerRect = scrollContainer.getBoundingClientRect();
            const itemCenter = rect.left + rect.width / 2;
            const containerCenter = containerRect.left + containerRect.width / 2;
            
            // If item is very close to center and we haven't paused for it recently
            if (Math.abs(itemCenter - containerCenter) < 5) {
              // Only pause if we haven't paused in the last few seconds
              // To avoid getting stuck in a loop of pausing
              const lastPause = (item as any)._lastPause || 0;
              if (time - lastPause > 10000) {
                shouldPause = true;
                (item as any)._lastPause = time;
              }
            }
          }
        });

        if (shouldPause) {
          setIsPaused(true);
          setTimeout(() => setIsPaused(false), 2500);
          return;
        }

        scrollPos.current += speed * deltaTime;
        
        const halfWidth = scrollContainer.scrollWidth / 2;
        if (scrollPos.current >= halfWidth) {
          scrollPos.current -= halfWidth;
        }
        
        scrollContainer.scrollLeft = scrollPos.current;
      }
      
      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [partners, isPaused]);

  const handleInteraction = () => {
    setIsPaused(true);
    if (pauseTimeout.current) clearTimeout(pauseTimeout.current);
    
    pauseTimeout.current = setTimeout(() => {
      setIsPaused(false);
    }, 3000);
  };

  const handleClick = (link: string) => {
    if (!link) return;
    if (link.startsWith('http')) {
      window.open(link, '_blank');
    } else if (link.length > 5) {
      if (/^\d+$/.test(link)) {
        window.open(`https://wa.me/${link}`, '_blank');
      } else {
        window.open(`https://instagram.com/${link.replace('@', '')}`, '_blank');
      }
    }
  };

  if (loading || partners.length === 0) return null;

  // Quadruple partners for infinite loop to be absolutely safe on large screens
  const displayPartners = [...partners, ...partners, ...partners, ...partners];

  return (
    <div 
      className="fixed bottom-6 left-6 right-6 z-[100] animate-in slide-in-from-bottom-10 duration-700"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleInteraction}
    >
      <div className="bg-black/60 backdrop-blur-xl rounded-[24px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col p-5 h-[110px] md:h-[130px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex flex-col">
            <h3 className="text-[#f5b041] text-[11px] md:text-xs font-black uppercase tracking-[0.2em] leading-none">
              Parceiros Oficiais da Arena
            </h3>
            <p className="text-white/30 text-[8px] font-bold uppercase tracking-widest mt-1">
              Empresas que fortalecem a +Vaquejada
            </p>
          </div>
        </div>

        {/* Marquee Wrapper */}
        <div className="relative flex-1 flex items-center group overflow-hidden">
          {/* Edge Fades (Masks) */}
          <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-black/80 via-black/40 to-transparent z-10 pointer-events-none" />

          {/* Scrollable Container */}
          <div 
            ref={scrollRef}
            className="flex items-center gap-12 md:gap-16 overflow-x-auto no-scrollbar scroll-smooth w-full h-full px-12"
            style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
            onScroll={(e) => {
                // Sync scrollPos if user scrolls manually
                if (isPaused) {
                    scrollPos.current = (e.target as HTMLDivElement).scrollLeft;
                }
            }}
          >
            {displayPartners.map((p, idx) => {
              const isPatrocinador = p.tipo === 'patrocinador';
              const isApoiador = p.tipo === 'apoiador';
              const isDestaque = p.destaque;

              return (
                <button
                  key={`${p.id}-${idx}`}
                  onClick={() => handleClick(p.link_url)}
                  className={cn(
                    "relative shrink-0 flex flex-col items-center justify-center transition-all duration-700 active:scale-95",
                    "grayscale opacity-70 hover:grayscale-0 hover:opacity-100 hover:scale-110",
                    isDestaque && "grayscale-0 opacity-100 scale-110 mx-6"
                  )}
                >
                  <div className="relative group/logo">
                    {/* Glow effect for highlights */}
                    {isDestaque && (
                        <div className="absolute inset-0 bg-[#f5b041]/20 blur-xl rounded-full scale-150 animate-pulse" />
                    )}
                    
                    <img 
                      src={p.logo_url} 
                      alt={p.nome_empresa} 
                      className={cn(
                        "h-8 md:h-9 w-auto object-contain transition-all duration-700",
                        isPatrocinador && "h-11 md:h-13",
                        isApoiador && "h-6 md:h-7 opacity-50",
                        isDestaque && "animate-pulse"
                      )}
                      loading="lazy"
                    />
                    
                    {/* Shine effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover/logo:translate-x-[200%] transition-transform duration-1000 pointer-events-none" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPremiumPartners;

