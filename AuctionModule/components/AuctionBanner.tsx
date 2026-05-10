import React from 'react';
import { Auction } from '../types';
import RealtimeCountdown from './RealtimeCountdown';

interface AuctionBannerProps {
    auction: Auction;
    onView: (id: string) => void;
}

const AuctionBanner: React.FC<AuctionBannerProps> = ({ auction, onView }) => {
    return (
        <div 
            onClick={() => onView(auction.id)}
            className="mx-6 mb-8 relative h-[380px] rounded-[40px] overflow-hidden border border-white/10 group cursor-pointer active:scale-[0.98] transition-all shadow-2xl"
        >
            {/* Background Image with Parallax-like effect on hover */}
            <img 
                src={auction.animal?.main_image_url} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110"
                alt={auction.animal?.name}
            />
            
            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F0A05] via-[#0F0A05]/20 to-transparent" />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />

            {/* Content Container */}
            <div className="absolute inset-0 p-8 flex flex-col justify-end">
                {/* Badges */}
                <div className="flex gap-2 mb-4">
                    <div className="bg-red-600 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg shadow-red-600/20 animate-pulse">
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Ao Vivo</span>
                    </div>
                    <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                        <span className="text-[10px] font-black text-[#ECA413] uppercase tracking-widest italic">Destaque Elite</span>
                    </div>
                </div>

                {/* Info */}
                <h2 className="text-white text-4xl font-black uppercase italic tracking-tighter leading-none mb-2 drop-shadow-2xl">
                    {auction.animal?.name}
                </h2>
                <p className="text-[#ECA413] text-[10px] font-black uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                    <span className="material-icons text-sm">verified</span>
                    {auction.animal?.breed} • Haras Oficial
                </p>

                {/* Bottom Bar */}
                <div className="flex items-end justify-between border-t border-white/10 pt-6">
                    <div>
                        <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-1">Termina em</p>
                        <RealtimeCountdown endDate={auction.end_at} />
                    </div>
                    <div className="bg-[#ECA413] text-black px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-[#ECA413]/20 group-hover:translate-x-2 transition-transform">
                        Ver Leilão
                    </div>
                </div>
            </div>

            {/* Decorative Glow */}
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#ECA413]/10 blur-[100px] pointer-events-none" />
        </div>
    );
};

export default AuctionBanner;
