
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
    const RINGING_URL = 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3';

    useEffect(() => {
        if (!userId) return;

        const channel = supabase.channel('calls_global')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'calls' }, (payload: any) => {
                handleIncomingCallEvent(payload.new);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calls' }, (payload: any) => {
                const data = payload.new;
                if (data.call_id === state.callId) {
                    if (data.status === 'ended' || data.status === 'rejected') {
                        handleEndCall();
                    } else if (data.status === 'connected') {
                        setState(prev => ({ ...prev, status: 'connected', startTime: Date.now() }));
                    }
                }
            })
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, [userId, state.callId]);

    const handleIncomingCallEvent = async (data: any) => {
        if (data.participants.includes(userId) && data.from_user !== userId && data.type === 'offer') {
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
        if (!audioRef.current) audioRef.current = new Audio(RINGING_URL);
        audioRef.current.loop = true;
        audioRef.current.play().catch(() => {});
    };

    const stopRingtone = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
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

    const rejectCall = async () => {
        stopRingtone();
        if (state.callId) {
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
        setState(initialState);
    };

    const endCall = async () => {
        if (state.callId) {
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
