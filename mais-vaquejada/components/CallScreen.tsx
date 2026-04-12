import React, { useState, useEffect, useRef } from 'react';
import { useCall } from '../context/CallContext';
import { CallControls } from './CallControls';
import { supabase } from '../lib/supabase';

export const CallScreen: React.FC = () => {
    const { state, setMinimized, acceptCall, rejectCall } = useCall();
    const [duration, setDuration] = useState('00:00');
    const [preCallAd, setPreCallAd] = useState<any | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);

    // Fetch Pre-call sponsorship ad (Using the correct ads_campaigns table)
    useEffect(() => {
        const fetchAd = async () => {
            if (state.active && state.status !== 'connected') {
                try {
                    const { data, error } = await supabase
                        .from('ads_campaigns')
                        .select('*')
                        .eq('status', 'active')
                        .contains('target_screen', ['video_call_waiting'])
                        .order('created_at', { ascending: false })
                        .limit(1);

                    if (data && data.length > 0) {
                        setPreCallAd(data[0]);
                    }
                } catch (err) {
                    console.error('Error fetching call ad:', err);
                }
            }
        };
        fetchAd();
    }, [state.active, state.status]);

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

    // Handle Local Video Stream
    useEffect(() => {
        if (state.active && state.type === 'video' && localVideoRef.current && (state as any).localStream) {
            localVideoRef.current.srcObject = (state as any).localStream;
        }
    }, [state.active, state.type]);

    if (!state.active || (state.isMinimized && state.status !== 'ringing')) return null;

    const firstRemoteId = Array.from(state.remoteProfiles.keys())[0];
    const profile = state.remoteProfiles.get(firstRemoteId || '');
    const remoteStream = state.remoteStreams.get(firstRemoteId || '');

    return (
        <div className="fixed inset-0 z-[400] bg-[#0F0A06] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
            {/* Sponsorship Background - Only during pre-connection */}
            {state.status !== 'connected' && preCallAd?.main_media_url && (
                <div className="absolute inset-0 z-0 animate-in fade-in duration-700">
                    <img 
                        src={preCallAd.main_media_url} 
                        className="w-full h-full object-cover" 
                        alt="Patrocínio"
                    />
                    {/* Dark overlay for readability */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
                </div>
            )}
            {/* Header: Status and Minimize */}
            <header className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-10">
                <button 
                    onClick={() => setMinimized(true)}
                    className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white"
                >
                    <span className="material-icons">keyboard_arrow_down</span>
                </button>
                <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ECA413] mb-1">
                        {state.type === 'video' ? 'CHAMADA DE VÍDEO' : 'CHAMADA DE ÁUDIO'}
                    </p>
                    <p className="text-white/60 text-xs font-bold uppercase tracking-widest">
                        {state.status === 'connected' ? duration : state.status.toUpperCase()}
                    </p>
                </div>
                <div className="w-10" />
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center p-8 relative">
                {state.type === 'video' && state.status === 'connected' ? (
                    <>
                        {/* Remote Video (Full Screen) */}
                        <video 
                            autoPlay 
                            playsInline 
                            className="absolute inset-0 w-full h-full object-cover"
                            ref={el => { if (el) el.srcObject = remoteStream || null; }}
                        />
                        {/* Local Video (Floating) */}
                        <div className="absolute top-24 right-6 w-32 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-20 bg-black">
                            <video 
                                autoPlay 
                                playsInline 
                                muted 
                                className="w-full h-full object-cover scale-x-[-1]"
                                ref={localVideoRef}
                            />
                        </div>
                    </>
                ) : (
                    <div className="text-center">
                        <div className="w-40 h-40 rounded-full bg-[#1A1108] border-4 border-[#ECA413] p-1 shadow-2xl mx-auto mb-8 relative">
                            <div className="w-full h-full rounded-full overflow-hidden bg-neutral-800">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar"/>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl text-white font-black">
                                        {profile?.username?.[0]?.toUpperCase() || '?'}
                                    </div>
                                )}
                            </div>
                            {state.status === 'connected' && (
                                <div className="absolute bottom-2 right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-[#0F0A06] flex items-center justify-center">
                                    <span className="material-icons text-white text-[10px]">wifi</span>
                                </div>
                            )}
                        </div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">
                            {profile?.username || 'USUÁRIO'}
                        </h2>
                        <p className="text-[#ECA413] font-bold text-sm tracking-widest animate-pulse">
                            {state.status === 'calling' ? 'CHAMANDO...' : 
                             state.status === 'ringing' ? 'TOCANDO...' : 
                             state.status === 'connected' ? 'CONECTADO' : 'CONECTANDO...'}
                        </p>
                    </div>
                )}
            </main>

            {/* Footer: Controls */}
            <footer className="p-12 pb-20 flex flex-col items-center gap-8 z-10">
                {state.isIncoming && state.status === 'ringing' ? (
                    <div className="flex gap-12">
                        <button 
                            onClick={rejectCall}
                            className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30 active:scale-95 transition-all"
                        >
                            <span className="material-icons text-3xl">call_end</span>
                        </button>
                        <button 
                            onClick={acceptCall}
                            className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/30 active:scale-95 animate-bounce transition-all"
                        >
                            <span className="material-icons text-3xl">call</span>
                        </button>
                    </div>
                ) : (
                    <CallControls />
                )}
            </footer>
        </div>
    );
};
