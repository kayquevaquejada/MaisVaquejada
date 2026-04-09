
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
    private pc: RTCPeerConnection | null = null;
    private localStream: MediaStream | null = null;
    private remoteStream: MediaStream | null = null;
    private currentSession: CallSession | null = null;
    private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
    private onStatusChangeCallback: ((status: CallStatus) => void) | null = null;

    async initMedia(type: CallType) {
        try {
            console.log(`[CallManager] Iniciando captura de mídia: ${type}`);
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
            status: 'calling'
        });

        this.setupPeerConnection();

        // 2. Criar Offer
        const offer = await this.pc!.createOffer();
        await this.pc!.setLocalDescription(offer);

        // 3. Enviar SDP
        await supabase.from('calls').insert({
            call_id: callId,
            from_user: fromUserId,
            participants: participants,
            type: 'offer',
            sdp: JSON.stringify(offer),
            status: 'calling'
        });

        return callId;
    }

    private setupPeerConnection() {
        this.pc = new RTCPeerConnection(configuration);

        // Adicionar tracks locais
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.pc!.addTrack(track, this.localStream!);
            });
        }

        // Receber tracks remotos
        this.pc.ontrack = (event) => {
            console.log('[CallManager] Track remoto recebido');
            this.remoteStream = event.streams[0];
            if (this.onRemoteStreamCallback) {
                this.onRemoteStreamCallback(this.remoteStream);
            }
        };

        // ICE Candidates
        this.pc.onicecandidate = async (event) => {
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

        this.pc.onconnectionstatechange = () => {
            console.log('[CallManager] Connection state:', this.pc?.connectionState);
            if (this.pc?.connectionState === 'connected') {
                this.updateStatus('connected');
            } else if (this.pc?.connectionState === 'disconnected' || this.pc?.connectionState === 'failed') {
                // Reconexão automática seria aqui
            }
        };
    }

    private async updateStatus(status: CallStatus) {
        if (this.currentSession) {
            this.currentSession.status = status;
            if (this.onStatusChangeCallback) this.onStatusChangeCallback(status);
            
            await supabase.from('calls').update({ status })
                .eq('call_id', this.currentSession.call_id);
        }
    }

    async handleIncomingCall(callData: any) {
        this.currentSession = {
            call_id: callData.call_id,
            from_user: callData.from_user,
            participants: callData.participants,
            type: callData.video ? 'video' : 'audio', 
            status: 'ringing'
        };
        
        // Notificar que está tocando
        await supabase.from('calls').insert({
            call_id: callData.call_id,
            from_user: callData.from_user,
            participants: callData.participants,
            type: 'ringing',
            status: 'ringing'
        });
    }

    async acceptCall() {
        if (!this.currentSession) return;
        
        await this.initMedia(this.currentSession.type);
        this.setupPeerConnection();

        // Buscar a offer original
        const { data } = await supabase.from('calls')
            .select('sdp')
            .eq('call_id', this.currentSession.call_id)
            .eq('type', 'offer')
            .single();

        if (data?.sdp) {
            const offer = JSON.parse(data.sdp);
            await this.pc!.setRemoteDescription(new RTCSessionDescription(offer));
            
            const answer = await this.pc!.createAnswer();
            await this.pc!.setLocalDescription(answer);

            await supabase.from('calls').insert({
                call_id: this.currentSession.call_id,
                from_user: this.currentSession.from_user,
                participants: this.currentSession.participants,
                type: 'answer',
                sdp: JSON.stringify(answer),
                status: 'accepted'
            });
        }
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

        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }
        if (this.localStream) {
            this.localStream.getTracks().forEach(t => t.stop());
            this.localStream = null;
        }
        this.remoteStream = null;
        this.currentSession = null;
    }

    onRemoteStream(callback: (stream: MediaStream) => void) {
        this.onRemoteStreamCallback = callback;
    }

    onStatusChange(callback: (status: CallStatus) => void) {
        this.onStatusChangeCallback = callback;
    }
}

export const callManager = new CallManager();
