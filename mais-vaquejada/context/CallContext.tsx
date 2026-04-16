
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { callManager, CallStatus, CallType } from '../lib/calls';

interface CallState {
    active: boolean;
    isIncoming: boolean;
    callId: string | null;
    fromUser: string | null;
    participants: string[];
    type: CallType;
    status: CallStatus;
    muted: boolean;
    speakerOn: boolean;
    videoEnabled: boolean;
    startTime: number | null;
    remoteStreams: Map<string, MediaStream>;
    remoteProfiles: Map<string, any>;
    localStream: MediaStream | null;
    isMinimized: boolean;
}

interface CallContextType {
    state: CallState;
    startCall: (participants: string[], type: CallType) => Promise<void>;
    acceptCall: () => Promise<void>;
    rejectCall: () => Promise<void>;
    endCall: () => Promise<void>;
    toggleMute: () => void;
    toggleVideo: () => void;
    toggleSpeaker: () => void;
    setMinimized: (min: boolean) => void;
}

const initialState: CallState = {
    active: false,
    isIncoming: false,
    callId: null,
    fromUser: null,
    participants: [],
    type: 'audio',
    status: 'idle' as any,
    muted: false,
    speakerOn: true,
    videoEnabled: true,
    startTime: null,
    remoteStreams: new Map(),
    remoteProfiles: new Map(),
    localStream: null,
    isMinimized: false
};

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode, userId: string | undefined }> = ({ children, userId }) => {
    const [state, setState] = useState<CallState>(initialState);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const vibrationInterval = useRef<any>(null);
    const currentCallIdRef = useRef<string | null>(null);
    const RINGING_URL = 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3';

    useEffect(() => {
        if (!userId) return;

        console.log('[CallContext] Subscribing for user:', userId);
        const channel = supabase.channel(`calls_user_${userId}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'calls'
            }, (payload: any) => {
                const data = payload.new;
                // Só processa se eu for um participante
                if (data.participants?.includes(userId)) {
                    if (data.type === 'offer') {
                        handleIncomingCallEvent(data);
                    }
                    // Sempre tenta processar sinalização
                    callManager.handleSignal(data);
                }
            })
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'calls' 
            }, (payload: any) => {
                const data = payload.new;
                if (data.call_id === currentCallIdRef.current) {
                    if (data.status === 'ended' || data.status === 'rejected') {
                        handleEndCall();
                    } else if (data.status === 'connected') {
                        setState(prev => ({ ...prev, status: 'connected', startTime: Date.now() }));
                    }
                }
            })
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, [userId]); // No more state.callId dependency

    const handleIncomingCallEvent = async (data: any) => {
        // Only accept if it's a new call or if we are already in THIS call
        if (data.from_user !== userId && data.type === 'offer') {
            
            // If we are already handling this specific call, don't restart everything
            if (currentCallIdRef.current === data.call_id) return;

            console.log('[CallContext] Incoming call offer:', data.call_id);
            currentCallIdRef.current = data.call_id;

            // Sincronizar session manager
            (callManager as any).currentSession = {
                call_id: data.call_id,
                from_user: data.from_user,
                participants: data.participants,
                type: data.sdp === 'video' ? 'video' : 'audio',
                status: 'ringing'
            };

            const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.from_user).single();
            
            setState(prev => ({
                ...prev,
                active: true,
                isIncoming: true,
                callId: data.call_id,
                fromUser: data.from_user,
                participants: data.participants,
                type: data.sdp === 'video' ? 'video' : 'audio',
                status: 'ringing',
                remoteProfiles: new Map(prev.remoteProfiles).set(data.from_user, profile)
            }));
            playRingtone();
        }
    };

    const playRingtone = () => {
        try {
            if (!audioRef.current) audioRef.current = new Audio(RINGING_URL);
            audioRef.current.loop = true;
            audioRef.current.play().catch(e => console.warn('Autoplay blocked:', e));

            // Iniciar Vibração
            if (navigator.vibrate) {
                navigator.vibrate([1000, 500, 1000, 500, 1000]);
                if (vibrationInterval.current) clearInterval(vibrationInterval.current);
                vibrationInterval.current = setInterval(() => {
                    navigator.vibrate([1000, 500, 1000]);
                }, 3000);
            }
        } catch (e) {
            console.error('Error playing ringtone:', e);
        }
    };

    const stopRingtone = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        if (navigator.vibrate) {
            navigator.vibrate(0);
        }
        if (vibrationInterval.current) {
            clearInterval(vibrationInterval.current);
            vibrationInterval.current = null;
        }
    };

    const startCall = async (participants: string[], type: CallType) => {
        if (!userId) return;
        
        try {
            const stream = await callManager.initMedia(type);
            
            const callId = await callManager.startCall(userId, participants, type);
            
            // Carregar perfis dos participantes
            const { data: profiles } = await supabase.from('profiles').select('*').in('id', participants);
            const profilesMap = new Map();
            profiles?.forEach(p => profilesMap.set(p.id, p));

            currentCallIdRef.current = callId;
            setState(prev => ({
                ...prev,
                active: true,
                isIncoming: false,
                callId,
                participants,
                type,
                status: 'calling',
                remoteProfiles: profilesMap,
                localStream: stream as any // Adicionando ao estado
            }));
        } catch (err) {
            alert('Acesso à mídia negado ou erro ao iniciar câmera.');
        }
    };

    const acceptCall = async () => {
        stopRingtone();
        const stream = await callManager.acceptCall();
        setState(prev => ({ 
            ...prev, 
            isIncoming: false, 
            status: 'connected', 
            startTime: Date.now(),
            localStream: stream as any
        }));
    };

    const logCallMessage = async (isMissed: boolean = true) => {
        if (!userId || !state.callId || !state.participants.length) return;
        
        const partnerId = state.participants.find(id => id !== userId);
        if (!partnerId) return;

        const now = new Date();
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        
        const callTypeLabel = state.type === 'video' ? 'Vídeo' : 'Áudio';
        const content = isMissed 
            ? `📞 Chamada de ${callTypeLabel} Perdida (${timeStr} - ${dateStr})`
            : `✅ Chamada de ${callTypeLabel} Encerrada (${timeStr})`;

        try {
            await supabase.from('messages').insert({
                sender_id: userId,
                receiver_id: partnerId,
                content
            });
        } catch (err) {
            console.error('Error logging call message:', err);
        }
    };

    const rejectCall = async () => {
        stopRingtone();
        if (state.callId) {
            await logCallMessage(true); // Log as missed call
            await supabase.from('calls').insert({
                call_id: state.callId,
                from_user: userId,
                participants: state.participants,
                type: 'rejected',
                status: 'rejected'
            });
        }
        handleEndCall();
    };

    const handleEndCall = () => {
        stopRingtone();
        callManager.endCall();
        currentCallIdRef.current = null;
        setState(initialState);
    };

    const endCall = async () => {
        if (state.callId) {
            // Se encerrar antes de conectar, loga como chamada perdida para o outro
            if (state.status !== 'connected') {
                await logCallMessage(true);
            }
            
            await supabase.from('calls').insert({
                call_id: state.callId,
                from_user: userId,
                participants: state.participants,
                type: 'end',
                status: 'ended'
            });
        }
        handleEndCall();
    };

    const toggleMute = () => {
        const muted = !callManager.toggleMute();
        setState(prev => ({ ...prev, muted }));
    };

    const toggleVideo = () => {
        const videoEnabled = !callManager.toggleVideo();
        setState(prev => ({ ...prev, videoEnabled }));
    };

    const toggleSpeaker = () => {
        setState(prev => ({ ...prev, speakerOn: !prev.speakerOn }));
    };

    const setMinimized = (isMinimized: boolean) => {
        setState(prev => ({ ...prev, isMinimized }));
    };

    // Manager Callbacks
    useEffect(() => {
        callManager.onRemoteStream((id, stream) => {
            setState(prev => ({
                ...prev,
                remoteStreams: new Map(prev.remoteStreams).set(id, stream)
            }));
        });
        
        callManager.onStatusChange(status => {
            setState(prev => ({ ...prev, status }));
        });
    }, []);

    return (
        <CallContext.Provider value={{
            state,
            startCall,
            acceptCall,
            rejectCall,
            endCall,
            toggleMute,
            toggleVideo,
            toggleSpeaker,
            setMinimized
        }}>
            {children}
        </CallContext.Provider>
    );
};

export const useCall = () => {
    const context = useContext(CallContext);
    if (!context) throw new Error('useCall must be used within CallProvider');
    return context;
};
