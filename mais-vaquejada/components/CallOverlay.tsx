
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { callManager, CallSession, CallStatus } from '../lib/calls';
import { User } from '../types';

const RINGING_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3';

interface CallOverlayProps {
    user: User | null;
}

const CallOverlay: React.FC<CallOverlayProps> = ({ user }) => {
    const [callSession, setCallSession] = useState<CallSession | null>(null);
    const [remoteProfile, setRemoteProfile] = useState<any>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [statusText, setStatusText] = useState('Chamando...');
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        if (!user) return;

        // Listener Realtime para chamadas
        const channel = supabase.channel('calls_realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'calls' }, (payload: any) => {
                handleCallEvent(payload.new);
            })
            .subscribe();

        const timeout = setTimeout(() => {
            if (callSession?.status === 'ringing' || callSession?.status === 'calling') {
                terminate();
            }
        }, 45000); // 45 seconds timeout

        return () => { 
            channel.unsubscribe(); 
            clearTimeout(timeout);
            stopRingtone();
        };
    }, [user, callSession?.status]);

    const handleCallEvent = async (data: any) => {
        // Se a chamada for para mim
        if (data.participants.includes(user?.id) || data.from_user === user?.id) {
            
            if (data.type === 'offer' && data.from_user !== user?.id) {
                // Nova chamada recebida
                setCallSession({
                    call_id: data.call_id,
                    from_user: data.from_user,
                    participants: data.participants,
                    type: data.video ? 'video' : 'audio',
                    status: 'ringing'
                });
                fetchRemoteProfile(data.from_user);
                playRingtone();
            }

            if (data.type === 'ringing' && data.from_user === user?.id) {
                setStatusText('Tocando...');
            }

            if (data.type === 'accepted') {
                stopRingtone();
                setStatusText('Conectando...');
            }

            if (data.type === 'end' || data.type === 'rejected') {
                terminate();
            }
        }
    };

    const fetchRemoteProfile = async (id: string) => {
        const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
        if (data) setRemoteProfile(data);
    };

    const playRingtone = () => {
        if (!audioRef.current) {
            audioRef.current = new Audio(RINGING_SOUND_URL);
            audioRef.current.loop = true;
        }
        audioRef.current.play().catch(e => console.warn('Erro ao tocar som:', e));
    };

    const stopRingtone = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const accept = async () => {
        stopRingtone();
        setStatusText('Conectando...');
        try {
            const stream = await callManager.acceptCall();
            // Status managed inside manager
        } catch (err) {
            terminate();
        }
    };

    const reject = async () => {
        stopRingtone();
        await supabase.from('calls').insert({
            call_id: callSession?.call_id,
            from_user: user?.id,
            participants: callSession?.participants,
            type: 'rejected',
            status: 'rejected'
        });
        terminate();
    };

    const terminate = () => {
        stopRingtone();
        callManager.endCall();
        setCallSession(null);
        setRemoteStream(null);
        setLocalStream(null);
        setRemoteProfile(null);
    };

    useEffect(() => {
        callManager.onRemoteStream((stream) => {
            setRemoteStream(stream);
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
        });
        callManager.onStatusChange((status) => {
            if (status === 'connected') setStatusText('Conectado');
        });
    }, []);

    if (!callSession) return null;

    return (
        <div className="fixed inset-0 z-[10000] bg-[#0F0A05]/95 backdrop-blur-xl flex flex-col items-center justify-between py-20 animate-in fade-in duration-500">
            {/* Som Oculto para Loop */}
            <audio ref={audioRef} src={RINGING_SOUND_URL} loop />

            <div className="flex flex-col items-center gap-6">
                <div className="relative">
                    <div className="w-32 h-32 rounded-full border-4 border-[#ECA413] p-1 animate-pulse">
                        <img 
                            src={remoteProfile?.avatar_url || `https://ui-avatars.com/api/?name=${remoteProfile?.username || 'user'}&background=random`} 
                            className="w-full h-full rounded-full object-cover" 
                        />
                    </div>
                </div>
                <div className="text-center">
                    <h2 className="text-white text-3xl font-black uppercase italic tracking-tighter">
                        {remoteProfile?.username || 'Vaqueiro'}
                    </h2>
                    <p className="text-[#ECA413] font-bold uppercase tracking-widest text-xs mt-2 animate-bounce">
                        {statusText}
                    </p>
                </div>
            </div>

            {/* Video Grid (Se for vídeo) */}
            {callSession.type === 'video' && (
                <div className="relative w-full px-4 flex-1 my-10 flex flex-col gap-4 items-center">
                    <div className="w-full max-w-sm aspect-video bg-neutral-900 rounded-2xl overflow-hidden border border-white/10 relative">
                        {remoteStream ? (
                            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center opacity-20">
                                <span className="material-icons text-white text-6xl">videocam_off</span>
                            </div>
                        )}
                        <div className="absolute top-4 left-4 bg-black/40 px-3 py-1 rounded-full text-[10px] font-black uppercase text-white tracking-widest">Remoto</div>
                    </div>
                    
                    <div className="absolute bottom-4 right-8 w-1/3 aspect-[3/4] bg-neutral-800 rounded-xl overflow-hidden border-2 border-[#ECA413] shadow-2xl z-20">
                        <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2 bg-black/40 px-2 py-0.5 rounded-full text-[8px] font-black uppercase text-white tracking-widest">Você</div>
                    </div>
                </div>
            )}

            <div className="flex gap-12 items-center">
                {callSession.status === 'ringing' ? (
                    <>
                        <button 
                            onClick={reject}
                            className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center text-white shadow-2xl shadow-red-600/20 active:scale-95 transition-transform"
                        >
                            <span className="material-icons text-3xl">call_end</span>
                        </button>
                        <button 
                            onClick={accept}
                            className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center text-white shadow-2xl shadow-green-500/20 animate-bounce active:scale-95 transition-transform"
                        >
                            <span className="material-icons text-3xl">call</span>
                        </button>
                    </>
                ) : (
                    <button 
                        onClick={terminate}
                        className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center text-white shadow-2xl shadow-red-600/20 active:scale-95 transition-transform"
                    >
                        <span className="material-icons text-3xl">call_end</span>
                    </button>
                )}
            </div>

            {/* Ações de Mídia */}
            <div className="flex gap-6 mt-12 opacity-60">
                <button className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white">
                    <span className="material-icons">mic</span>
                </button>
                <button className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white">
                    <span className="material-icons">videocam</span>
                </button>
                <button className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white">
                    <span className="material-icons">volume_up</span>
                </button>
            </div>
        </div>
    );
};

export default CallOverlay;
