
import React from 'react';
import { useCall } from '../context/CallContext';

export const CallControls: React.FC<{ size?: 'sm' | 'lg' }> = ({ size = 'lg' }) => {
    const { state, toggleMute, toggleVideo, toggleSpeaker, endCall } = useCall();
    
    const iconSize = size === 'lg' ? 'text-2xl' : 'text-xl';
    const btnSize = size === 'lg' ? 'w-14 h-14' : 'w-10 h-10';

    return (
        <div className={`flex items-center justify-center ${size === 'lg' ? 'gap-6' : 'gap-3'}`}>
            <button 
                onClick={toggleMute}
                className={`${btnSize} rounded-full flex items-center justify-center transition-all ${state.muted ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
                <span className={`material-icons ${iconSize}`}>{state.muted ? 'mic_off' : 'mic'}</span>
            </button>

            {state.type === 'video' && (
                <button 
                    onClick={toggleVideo}
                    className={`${btnSize} rounded-full flex items-center justify-center transition-all ${!state.videoEnabled ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                    <span className={`material-icons ${iconSize}`}>{state.videoEnabled ? 'videocam' : 'videocam_off'}</span>
                </button>
            )}

            <button 
                onClick={toggleSpeaker}
                className={`${btnSize} rounded-full flex items-center justify-center transition-all ${state.speakerOn ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
                <span className={`material-icons ${iconSize}`}>{state.speakerOn ? 'volume_up' : 'volume_down'}</span>
            </button>

            <button 
                onClick={endCall}
                className={`${btnSize} rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 active:scale-90 transition-all shadow-lg shadow-red-500/20`}
            >
                <span className={`material-icons ${iconSize}`}>call_end</span>
            </button>
        </div>
    );
};
