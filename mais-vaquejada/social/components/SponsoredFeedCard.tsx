import React, { useEffect, useRef, useState } from 'react';
import { InternalAdCampaign } from '../types/ads';

interface SponsoredFeedCardProps {
  campaign: InternalAdCampaign;
  feedPosition: number;
  onImpression: (campaignId: string, position: number) => void;
  onClick: (campaign: InternalAdCampaign) => void;
}

export const SponsoredFeedCard: React.FC<SponsoredFeedCardProps> = ({ 
  campaign, 
  feedPosition, 
  onImpression, 
  onClick 
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hasTracked, setHasTracked] = useState(false);

  // Fallback para evitar tela branca caso falte algo crítico
  if (!campaign || !campaign.id) return null;

  useEffect(() => {
    if (hasTracked || !cardRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        onImpression(campaign.id, feedPosition);
        setHasTracked(true);
        observer.disconnect();
      }
    }, { threshold: 0.5 }); // Conta a impressão quando 50% do card está na tela

    observer.observe(cardRef.current);
    
    return () => observer.disconnect();
  }, [campaign.id, feedPosition, hasTracked, onImpression]);

  return (
    <div 
      ref={cardRef}
      className="bg-[#1C1611]/80 backdrop-blur-md mb-2 sm:mb-4 border-y sm:border border-white/5 sm:rounded-[32px] overflow-hidden max-w-2xl mx-auto shadow-[0_15px_40px_rgba(236,164,19,0.03)] cursor-pointer hover:border-white/10 transition-colors animate-in fade-in duration-500"
      onClick={() => onClick(campaign)}
    >
      {/* Header Premium Patrocinado */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#ECA413]/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-lg border border-white/10">
            {campaign.advertiser_logo_url ? (
              <img src={campaign.advertiser_logo_url} alt={campaign.advertiser_name} className="w-full h-full object-contain" onError={(e) => e.currentTarget.src='https://ui-avatars.com/api/?name='+campaign.advertiser_name+'&background=ECA413&color=000'} />
            ) : (
              <span className="text-[#ECA413] font-black text-xl">{campaign.advertiser_name[0]}</span>
            )}
          </div>
          <div>
            <h3 className="font-black text-white text-[15px] leading-tight flex items-center gap-1">
              {campaign.advertiser_name}
              <span className="material-icons text-[#ECA413] text-[14px]">verified</span>
            </h3>
            <span className="text-[#ECA413] text-[9px] font-black uppercase tracking-[0.2em]">Conteúdo Patrocinado</span>
          </div>
        </div>
        <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors">
          <span className="material-icons text-lg">more_horiz</span>
        </button>
      </div>

      {/* Título Forte */}
      {campaign.public_title && (
        <div className="px-5 py-2">
          <h2 className="text-white text-lg font-black uppercase italic tracking-tight">{campaign.public_title}</h2>
        </div>
      )}

      {/* Mídia Principal */}
      <div className="relative w-full aspect-square bg-[#0F0A06] overflow-hidden group">
        {campaign.media_type === 'video' ? (
          <video 
            src={campaign.main_media_url} 
            className="w-full h-full object-cover" 
            autoPlay 
            muted 
            loop 
            playsInline
          />
        ) : (
          <img 
            src={campaign.main_media_url} 
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" 
            alt={campaign.public_title}
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80';
            }}
          />
        )}
        
        {/* Call to Action Sobreposto */}
        <div className="absolute bottom-4 right-4 z-10 flex border-2 border-[#1C1611]/50 rounded-full">
            <button className="bg-[#ECA413] text-black px-6 py-3 rounded-full font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all">
                {campaign.cta_text}
                <span className="material-icons text-sm">open_in_new</span>
            </button>
        </div>
      </div>

      {/* Footer do Anúncio */}
      {campaign.description && (
        <div className="p-5 flex gap-2 border-t border-white/5">
          <div className="w-1 bg-[#ECA413] rounded-full shrink-0"></div>
          <p className="text-sm font-medium text-white/80 leading-relaxed line-clamp-3">
            {campaign.description}
          </p>
        </div>
      )}
    </div>
  );
};
