
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
    const [remoteProfiles, setRemoteProfiles] = useState<Map<string, any>>(new Map());
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [statusText, setStatusText] = useState('Chamando...');
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
    const localVideoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        if (!user) return;

        const channel = supabase.channel('calls_realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'calls' }, (payload: any) => {
                handleCallEvent(payload.new);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calls' }, (payload: any) => {
                if (payload.new.status === 'ended' && payload.new.call_id === callSession?.call_id) {
                    terminate();
                }
            })
            .subscribe();

        return () => { channel.unsubscribe(); stopRingtone(); };
    }, [user, callSession?.call_id]);

    const handleCallEvent = async (data: any) => {
        if (data.participants.includes(user?.id) || data.from_user === user?.id) {
            
            if (data.type === 'offer' && data.from_user !== user?.id && !callSession) {
                setCallSession({
                    call_id: data.call_id,
                    from_user: data.from_user,
                    participants: data.participants,
                    type: data.sdp === 'video' ? 'video' : 'audio',
                    status: 'ringing'
                });
                fetchProfile(data.from_user);
                playRingtone();
            }

            if (data.type === 'answer' && data.from_user !== user?.id) {
                const answer = JSON.parse(data.sdp);
                // O manager cuida disso via sinalização se integrarmos mais, mas aqui vamos apenas atualizar UI
                setStatusText('Conectado');
            }

            if (data.type === 'end') terminate();
        }
    };

    const fetchProfile = async (id: string) => {
        const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
        if (data) setRemoteProfiles(prev => new Map(prev).set(id, data));
    };

    const toggleMute = () => setIsMuted(!callManager.toggleMute());
    const toggleVideo = () => setIsVideoOff(!callManager.toggleVideo());

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
        await callManager.acceptCall();
        
        const remoteUsername = remoteProfiles.get(callSession?.from_user || '')?.username;
        if (remoteUsername) {
            window.dispatchEvent(new CustomEvent('arena_new_message', { 
                detail: { text: `📞 Chamada ${callSession?.type === 'video' ? 'de vídeo' : ''} iniciada`, chatWith: remoteUsername } 
            }));
        }
    };

    const terminate = () => {
        stopRingtone();
        
        const remoteUsername = remoteProfiles.get(callSession?.from_user || '')?.username;
        if (remoteUsername && statusText === 'Conectado') {
             window.dispatchEvent(new CustomEvent('arena_new_message', { 
                detail: { text: `📞 Chamada encerrada`, chatWith: remoteUsername } 
            }));
        }

        callManager.endCall();
        setCallSession(null);
        setRemoteStreams(new Map());
        setRemoteProfiles(new Map());
    };

    useEffect(() => {
        callManager.onRemoteStream((id, stream) => {
            setRemoteStreams(prev => new Map(prev).set(id, stream));
            fetchProfile(id);
        });
        callManager.onStatusChange(status => {
            if (status === 'connected') setStatusText('Conectado');
        });
    }, []);

    if (!callSession) return null;

    const remoteIds = Array.from(remoteStreams.keys());

    return (
        <div className="fixed inset-0 z-[10000] bg-[#0F0A05]/95 backdrop-blur-3xl flex flex-col items-center justify-between py-12 animate-in fade-in duration-500 overflow-hidden">
            <audio ref={audioRef} src={RINGING_SOUND_URL} loop />

            <div className="flex flex-col items-center gap-4 z-10">
                <div className="w-24 h-24 rounded-full border-2 border-[#ECA413]/30 p-1">
                    <img 
                        src={remoteProfiles.get(callSession.from_user)?.avatar_url || `https://ui-avatars.com/api/?name=User&background=random`} 
                        className="w-full h-full rounded-full object-cover" 
                    />
                </div>
                <div className="text-center">
                    <h2 className="text-white text-2xl font-black uppercase italic tracking-tighter">
                        {remoteProfiles.get(callSession.from_user)?.username || 'Chamada Arena'}
                    </h2>
                    <p className="text-[#ECA413] font-bold uppercase tracking-widest text-[10px] mt-1 animate-pulse">
                        {statusText}
                    </p>
                </div>
            </div>

            {/* Grid de Vídeo Dinâmico */}
            {callSession.type === 'video' && (
                <div className="flex-1 w-full max-w-4xl px-6 grid grid-cols-1 md:grid-cols-2 gap-4 my-8 items-center justify-center auto-rows-fr">
                    {remoteStreams.size === 0 && (
                        <div className="col-span-full flex flex-col items-center opacity-20">
                            <span className="material-icons text-white text-6xl animate-pulse">videocam_off</span>
                        </div>
                    )}
                    
                    {Array.from(remoteStreams.entries()).map(([id, stream]) => (
                        <div key={id} className="relative rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 shadow-2xl overflow-hidden aspect-video">
                            <video 
                                autoPlay 
                                playsInline 
                                className="w-full h-full object-cover" 
                                ref={el => { if (el) el.srcObject = stream; }} 
                            />
                            <div className="absolute bottom-3 left-3 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full text-[8px] font-black uppercase text-white tracking-widest">
                                {remoteProfiles.get(id)?.username || 'Vaqueiro'}
                            </div>
                        </div>
                    ))}

                    <div className={`relative rounded-2xl overflow-hidden bg-neutral-800 border-2 border-[#ECA413]/50 shadow-2xl transition-all aspect-video ${remoteStreams.size > 0 ? '' : 'max-w-xs mx-auto w-full'}`}>
                         <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover mirror" />
                         <div className="absolute bottom-3 left-3 bg-[#ECA413]/80 backdrop-blur-md px-2 py-0.5 rounded-full text-[8px] font-black text-black tracking-widest uppercase">VOCÊ</div>
                    </div>
                </div>
            )}

            <div className="flex flex-col items-center gap-10">
                <div className="flex gap-8 items-center">
                    {/* Controles de Mídia */}
                    {statusText === 'Conectado' && (
                        <button onClick={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                            <span className="material-icons">{isMuted ? 'mic_off' : 'mic'}</span>
                        </button>
                    )}

                    <div className="flex gap-12 items-center">
                        {callSession.status === 'ringing' ? (
                            <>
                                <button onClick={terminate} className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center text-white shadow-[0_0_50px_rgba(220,38,38,0.3)] active:scale-90 transition-all">
                                    <span className="material-icons text-4xl">call_end</span>
                                </button>
                                <button onClick={accept} className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center text-white shadow-[0_0_50px_rgba(34,197,94,0.3)] animate-bounce active:scale-90 transition-all">
                                    <span className="material-icons text-4xl">call</span>
                                </button>
                            </>
                        ) : (
                            <button onClick={terminate} className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center text-white shadow-[0_0_50px_rgba(220,38,38,0.3)] active:scale-90 transition-all">
                                <span className="material-icons text-4xl">call_end</span>
                            </button>
                        )}
                    </div>

                    {statusText === 'Conectado' && callSession.type === 'video' && (
                        <button onClick={toggleVideo} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                            <span className="material-icons">{isVideoOff ? 'videocam_off' : 'videocam'}</span>
                        </button>
                    )}
                </div>

                <div className="flex gap-8 opacity-40">
                    <button className="material-icons text-white">volume_up</button>
                    <button className="material-icons text-white">flip_camera_ios</button>
                    <button className="material-icons text-white">screen_share</button>
                </div>
            </div>
        </div>
    );
};

export default CallOverlay;
