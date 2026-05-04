import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SponsorMarqueeProps {
    type?: 'all' | 'news_only';
}

const SponsorMarquee: React.FC<SponsorMarqueeProps> = ({ type = 'all' }) => {
    const [logos, setLogos] = useState<any[]>([]);
    const [showMarquee, setShowMarquee] = useState(true);

    useEffect(() => {
        const fetchLogos = async () => {
            // Check if we should show the marquee based on settings
            const { data: settings } = await supabase
                .from('app_settings')
                .select('*')
                .in('key', ['official_sponsors', 'official_partners', 'news_show_marquee']);
            
            if (settings) {
                const showSetting = settings.find(i => i.key === 'news_show_marquee')?.value;
                // If explicitly disabled and we are in a news context
                if (showSetting === false && type === 'news_only') {
                    setShowMarquee(false);
                    return;
                }

                const s = settings.find(i => i.key === 'official_sponsors')?.value || [];
                const p = settings.find(i => i.key === 'official_partners')?.value || [];
                const combined = [
                    ...(Array.isArray(s) ? s : []),
                    ...(Array.isArray(p) ? p : [])
                ];
                setLogos(combined);
            }
        };
        fetchLogos();
    }, [type]);

    if (!showMarquee || logos.length === 0) return null;

    return (
        <div className="w-full overflow-hidden bg-white/50 backdrop-blur-sm py-8 border-t border-b border-gray-100 mt-12 mb-6">
            <style>{`
                @keyframes marquee-scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee-scroll {
                    display: flex;
                    width: max-content;
                    animation: marquee-scroll 40s linear infinite;
                }
                .animate-marquee-scroll:hover {
                    animation-play-state: paused;
                }
            `}</style>
            
            <div className="mb-4 text-center px-6">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Patrocinadores Oficiais</p>
            </div>

            <div className="relative flex overflow-hidden">
                <div className="animate-marquee-scroll flex items-center gap-16 px-8">
                    {[...logos, ...logos, ...logos].map((logo, idx) => (
                        <img 
                            key={idx} 
                            src={logo.url} 
                            alt="Sponsor" 
                            className="h-16 sm:h-20 w-auto object-contain grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all shrink-0" 
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SponsorMarquee;
