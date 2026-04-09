
import { supabase } from './supabase';

export type CallStatus = 'calling' | 'ringing' | 'connected' | 'ended' | 'rejected';
export type CallType = 'audio' | 'video';

export interface CallSession {
    call_id: string;
    from_user: string;
    participants: string[];
    type: CallType;
    status: CallStatus;
}

const configuration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
    ]
};

class CallManager {
    private pcs: Map<string, RTCPeerConnection> = new Map();
    private localStream: MediaStream | null = null;
    private remoteStreams: Map<string, MediaStream> = new Map();
    private currentSession: CallSession | null = null;
    private onRemoteStreamCallback: ((id: string, stream: MediaStream) => void) | null = null;
    private onRemoteLeaveCallback: ((id: string) => void) | null = null;
    private onStatusChangeCallback: ((status: CallStatus) => void) | null = null;

    async initMedia(type: CallType) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: type === 'video'
            });
            this.localStream = stream;
            return stream;
        } catch (err) {
            console.error('[CallManager] Erro ao acessar mídia:', err);
            throw err;
        }
    }

    async startCall(fromUserId: string, participants: string[], type: CallType) {
        const callId = Math.random().toString(36).substring(7);
        this.currentSession = { call_id: callId, from_user: fromUserId, participants, type, status: 'calling' };

        // 1. Inserir chamada inicial
        await supabase.from('calls').insert({
            call_id: callId,
            from_user: fromUserId,
            participants: participants,
            type: 'offer',
            status: 'calling',
            sdp: type // Usando campo sdp temporariamente para indicar tipo se necessário
        });

        // Para cada participante, criar uma conexão (Mesh Network simplificada)
        for (const targetId of participants) {
            await this.createPeer(targetId, true);
        }

        return callId;
    }

    private async createPeer(targetId: string, isInitiator: boolean) {
        const pc = new RTCPeerConnection(configuration);
        this.pcs.set(targetId, pc);

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream!));
        }

        pc.ontrack = (event) => {
            console.log(`[CallManager] Track recebido de ${targetId}`);
            this.remoteStreams.set(targetId, event.streams[0]);
            if (this.onRemoteStreamCallback) {
                this.onRemoteStreamCallback(targetId, event.streams[0]);
            }
        };

        pc.onicecandidate = async (event) => {
            if (event.candidate && this.currentSession) {
                await supabase.from('calls').insert({
                    call_id: this.currentSession.call_id,
                    from_user: this.currentSession.from_user,
                    participants: this.currentSession.participants,
                    type: 'ice',
                    candidate: event.candidate.toJSON(),
                    status: this.currentSession.status
                });
            }
        };

        if (isInitiator) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await supabase.from('calls').insert({
                call_id: this.currentSession!.call_id,
                from_user: this.currentSession!.from_user,
                participants: [targetId],
                type: 'offer',
                sdp: JSON.stringify(offer),
                status: 'calling'
            });
        }

        return pc;
    }

    async acceptCall() {
        if (!this.currentSession) return;
        
        await this.initMedia(this.currentSession.type);
        
        // Responder a todas as offers recebidas
        const { data: offers } = await supabase.from('calls')
            .select('*')
            .eq('call_id', this.currentSession.call_id)
            .eq('type', 'offer');

        if (offers) {
            for (const offerData of offers) {
                if (offerData.from_user !== this.currentSession.from_user) {
                    const pc = await this.createPeer(offerData.from_user, false);
                    if (offerData.sdp) {
                        await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerData.sdp)));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        await supabase.from('calls').insert({
                            call_id: this.currentSession.call_id,
                            from_user: this.currentSession.from_user,
                            participants: [offerData.from_user],
                            type: 'answer',
                            sdp: JSON.stringify(answer),
                            status: 'accepted'
                        });
                    }
                }
            }
        }
    }

    toggleMute() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) audioTrack.enabled = !audioTrack.enabled;
            return audioTrack.enabled;
        }
        return false;
    }

    toggleVideo() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) videoTrack.enabled = !videoTrack.enabled;
            return videoTrack.enabled;
        }
        return false;
    }

    async endCall() {
        if (this.currentSession) {
             await supabase.from('calls').insert({
                call_id: this.currentSession.call_id,
                from_user: this.currentSession.from_user,
                participants: this.currentSession.participants,
                type: 'end',
                status: 'ended'
            });
        }

        this.pcs.forEach(pc => pc.close());
        this.pcs.clear();
        
        if (this.localStream) {
            this.localStream.getTracks().forEach(t => t.stop());
            this.localStream = null;
        }
        this.remoteStreams.clear();
        this.currentSession = null;
    }

    private async updateStatus(status: CallStatus) {
        if (this.currentSession) {
            this.currentSession.status = status;
            if (this.onStatusChangeCallback) this.onStatusChangeCallback(status);
            
            await supabase.from('calls').update({ status })
                .eq('call_id', this.currentSession.call_id);
        }
    }

    onRemoteStream(callback: (id: string, stream: MediaStream) => void) {
        this.onRemoteStreamCallback = callback;
    }

    onRemoteLeave(callback: (id: string) => void) {
        this.onRemoteLeaveCallback = callback;
    }

    onStatusChange(callback: (status: CallStatus) => void) {
        this.onStatusChangeCallback = callback;
    }
}

export const callManager = new CallManager();
