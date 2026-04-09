import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AdsCarouselProps {
    targetPosition: string;
}

const AdsCarousel: React.FC<AdsCarouselProps> = ({ targetPosition }) => {
    const [ads, setAds] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAds();
    }, [targetPosition]);

    const fetchAds = async () => {
        setLoading(true);
        try {
            // Fetch all active ads without the .contains() filter (which can silently fail
            // if the column type isn't explicitly a Postgres text[] array).
            // We filter locally instead for bulletproof reliability.
            const { data, error } = await supabase
                .from('ads_campaigns')
                .select('*')
                .eq('status', 'active')
                .order('priority', { ascending: false })
                .order('display_order', { ascending: true });

            if (error) {
                console.error("Erro ao buscar anúncios:", error);
                return;
            }

            const now = new Date();
            const validAds = (data || []).filter(ad => {
                if (ad.status !== 'active') return false;
                if (ad.start_at && new Date(ad.start_at) > now) return false;
                if (ad.end_at && new Date(ad.end_at) < now) return false;

                // Check if this ad targets the current screen position
                // Handle both array and string formats for maximum compatibility
                const screens = ad.target_screen;
                if (!screens) return false;
                if (Array.isArray(screens)) {
                    return screens.includes(targetPosition);
                }
                if (typeof screens === 'string') {
                    // Could be a JSON string like '["market_top_carousel"]'
                    try {
                        const parsed = JSON.parse(screens);
                        return Array.isArray(parsed) && parsed.includes(targetPosition);
                    } catch {
                        return screens === targetPosition;
                    }
                }
                return false;
            });

            setAds(validAds);

            if (validAds.length > 0) {
                registerImpression(validAds[0].id);
            }

        } catch (err) {
            console.error("Flow error fetching ads:", err);
        } finally {
            setLoading(false);
        }
    };

    // Auto-play logic
    useEffect(() => {
        if (ads.length <= 1) return;

        const currentAd = ads[currentIndex];
        const durationMs = (Number(currentAd?.duration_seconds) || 5) * 1000;

        const timer = setTimeout(() => {
            setCurrentIndex(prev => (prev + 1) % ads.length);
        }, durationMs);

        return () => clearTimeout(timer);
    }, [currentIndex, ads.length]);

    // Independent effect to trigger analytics without complicating the timer
    useEffect(() => {
        if (ads.length > 1 && ads[currentIndex]) {
            registerImpression(ads[currentIndex].id);
        }
    }, [currentIndex]);

    const registerImpression = (adId: string) => {
        supabase.from('ad_impressions').insert({ ad_id: adId, screen_name: targetPosition }).then();
    };

    const handleAdClick = (ad: any) => {
        supabase.from('ad_clicks').insert({ ad_id: ad.id, screen_name: targetPosition }).then();
        if (ad.action_type === 'external_link' && ad.action_value) {
            window.open(ad.action_value, '_blank');
        } else if (ad.action_type === 'whatsapp' && ad.action_value) {
            const formattedNumber = ad.action_value.replace(/\D/g, '');
            window.open(`https://wa.me/${formattedNumber}`, '_blank');
        }
    };

    if (loading) {
        return (
            <div className="mx-4 my-2 h-32 bg-black/5 rounded-[24px] animate-pulse flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-leather/20 border-t-leather/40 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (ads.length === 0) {
        return (
            <div className="mx-4 my-2 relative rounded-[24px] overflow-hidden aspect-[3/1] bg-gradient-to-r from-[#1A1108] to-[#2A1F16] flex items-center justify-center shadow-lg border border-[#D4AF37]/20">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] pointer-events-none"></div>
                <div className="text-center z-10 p-4">
                    <span className="material-icons text-[#D4AF37] text-2xl mb-1 opacity-80">campaign</span>
                    <h3 className="text-white font-black uppercase tracking-widest text-[10px] md:text-xs">
                        Anuncie Aqui
                    </h3>
                    <p className="text-white/40 text-[8px] uppercase tracking-widest mt-1">Seja Parceiro Oficial</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative mx-4 my-2 group">
            <div className="relative rounded-[24px] overflow-hidden aspect-[3/1] bg-black shadow-lg border border-[#D4AF37]/20">
                {ads.map((ad, idx) => {
                    const isActive = currentIndex === idx;
                    const imgUrlSafe = ad.image_url?.split('?pos=')[0] || ad.image_url;
                    let imgPosSafe = ad.image_url?.split('?pos=')[1];
                    if (imgPosSafe && !isNaN(Number(imgPosSafe))) {
                        imgPosSafe = `center ${imgPosSafe}%`;
                    } else {
                        imgPosSafe = imgPosSafe || 'center';
                    }

                    return (
                        <div 
                            key={ad.id}
                            onClick={() => handleAdClick(ad)}
                            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${ad.action_type !== 'none' ? 'cursor-pointer' : ''} ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
                        >
                            <img 
                                src={imgUrlSafe} 
                                alt={ad.title || 'Anúncio'} 
                                style={{ objectPosition: imgPosSafe }}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                            
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                                <span className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37] backdrop-blur-md px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest w-fit mb-1 shadow-sm">Patrocinado</span>
                                {ad.title && <h3 className="text-white font-black text-sm uppercase max-w-[80%] leading-tight drop-shadow-lg">{ad.title}</h3>}
                                {ad.description && <p className="text-white/80 text-[9px] font-medium max-w-[70%] mt-0.5 line-clamp-1">{ad.description}</p>}
                            </div>

                            {ad.action_type !== 'none' && ad.cta_text && (
                                <div className="absolute bottom-4 right-4 bg-[#D4AF37] text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md flex items-center gap-1 active:scale-95">
                                    {ad.cta_text} <span className="material-icons text-[10px]">chevron_right</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {ads.length > 1 && (
                <div className="absolute top-3 right-4 flex gap-1.5 z-20 bg-black/60 px-2.5 py-1.5 rounded-full backdrop-blur-md opacity-50 hover:opacity-100 transition-opacity cursor-pointer shadow-lg border border-white/10 shadow-black/50">
                    {ads.map((_, i) => (
                        <div 
                            key={i} 
                            onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
                            className={`h-1.5 rounded-full transition-all duration-500 ${currentIndex === i ? 'w-4 bg-[#D4AF37]' : 'w-1.5 bg-white/60 hover:bg-white/90'}`} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdsCarousel;
