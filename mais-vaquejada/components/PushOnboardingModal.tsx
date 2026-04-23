import React, { useState, useEffect } from 'react';
import { PushPermissionManager } from '../lib/push/PushPermissionManager';
import { Preferences } from '@capacitor/preferences';

interface PushOnboardingModalProps {
    userId: string;
}

export const PushOnboardingModal: React.FC<PushOnboardingModalProps> = ({ userId }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkStatus = async () => {
            if (!userId) {
                setLoading(false);
                return;
            }
            // Check if we've already asked
            const { value } = await Preferences.get({ key: `push_requested_${userId}` });
            if (value !== 'true') {
                setIsVisible(true);
            } else {
                // If they already accepted previously, initialize push listeners silently
                await PushPermissionManager.initialize(userId);
            }
            setLoading(false);
        };
        checkStatus();
    }, [userId]);

    const handleAllow = async () => {
        setIsVisible(false);
        await PushPermissionManager.requestPermission(userId);
    };

    const handleDeny = async () => {
        setIsVisible(false);
        // We still mark it as requested so we don't bother them again
        await Preferences.set({ key: `push_requested_${userId}`, value: 'true' });
    };

    if (!isVisible || loading) return null;

    return (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-[32px] p-8 text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-[#D4AF37] to-[#ECA413] opacity-10"></div>
                
                <div className="w-20 h-20 bg-gradient-to-br from-[#D4AF37] to-[#ECA413] rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-lg shadow-[#D4AF37]/30">
                    <span className="material-icons text-white text-4xl">notifications_active</span>
                </div>
                
                <h2 className="text-2xl font-black uppercase text-[#1A1108] mb-3 tracking-tight">Fique por dentro!</h2>
                <p className="text-sm font-medium text-[#1A1108]/60 mb-8 leading-relaxed">
                    Ative as notificações para ser avisado sobre novas <strong>Lives</strong>, <strong>Notícias Urgentes</strong> e mensagens do <strong>Mercado</strong>. Prometemos não mandar spam!
                </p>

                <div className="space-y-3 relative z-10">
                    <button 
                        onClick={handleAllow}
                        className="w-full bg-gradient-to-r from-[#D4AF37] to-[#ECA413] text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-[#D4AF37]/20 active:scale-95 transition-transform"
                    >
                        Ativar Notificações
                    </button>
                    <button 
                        onClick={handleDeny}
                        className="w-full bg-transparent text-[#1A1108]/40 py-3 rounded-xl font-black uppercase tracking-widest text-xs active:scale-95 transition-transform"
                    >
                        Agora Não
                    </button>
                </div>
            </div>
        </div>
    );
};
