
import React, { useState, useEffect } from 'react';
import { useCall } from '../context/CallContext';

export const CallBar: React.FC = () => {
    const { state, setMinimized, endCall, toggleMute } = useCall();
    const [duration, setDuration] = useState('00:00');

    useEffect(() => {
        if (!state.active || !state.startTime) return;

        const interval = setInterval(() => {
            const diff = Math.floor((Date.now() - (state.startTime || 0)) / 1000);
            const m = Math.floor(diff / 60).toString().padStart(2, '0');
            const s = (diff % 60).toString().padStart(2, '0');
            setDuration(`${m}:${s}`);
        }, 1000);

        return () => clearInterval(interval);
    }, [state.active, state.startTime]);

    if (!state.active || !state.isMinimized) return null;

    const firstRemoteId = Array.from(state.remoteProfiles.keys())[0];
    const profile = state.remoteProfiles.get(firstRemoteId || '');

    return (
        <div 
            onClick={() => setMinimized(false)}
            className="fixed top-4 left-4 right-4 z-[300] bg-[#1A1108] border border-[#ECA413]/30 rounded-2xl p-3 flex items-center justify-between shadow-2xl animate-in slide-in-from-top duration-300 cursor-pointer hover:bg-[#25190d]"
        >
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#ECA413] flex items-center justify-center text-black font-black overflow-hidden border border-white/10">
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar"/>
                    ) : (
                        <span>{profile?.username?.[0]?.toUpperCase() || '?'}</span>
                    )}
                </div>
                <div>
                    <h4 className="text-[11px] font-black text-white uppercase tracking-widest truncate max-w-[120px]">
                        {profile?.username || 'Em Chamada'}
                    </h4>
                    <p className="text-[9px] font-bold text-[#ECA413] uppercase tracking-tighter">
                        {state.status === 'connected' ? `Conectado • ${duration}` : 'Chamando...'}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button 
                    onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${state.muted ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
                >
                    <span className="material-icons text-lg">{state.muted ? 'mic_off' : 'mic'}</span>
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); endCall(); }}
                    className="w-9 h-9 rounded-xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600 active:scale-95 transition-all shadow-lg shadow-red-500/20"
                >
                    <span className="material-icons text-lg">call_end</span>
                </button>
            </div>
        </div>
    );
};
