import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { useMediaUpload } from '../social/hooks/useMediaUpload';

interface MediaCreationViewProps {
    user: User | null;
    onClose: () => void;
    onSuccess: () => void;
}

type Step = 'CAMERA' | 'PREVIEW' | 'PUBLISH';
type Mode = 'FEED' | 'STORY';

const MediaCreationView: React.FC<MediaCreationViewProps> = ({ user, onClose, onSuccess }) => {
    const [step, setStep] = useState<Step>('CAMERA');
    const [mode, setMode] = useState<Mode>('FEED');
    const [capturedMedia, setCapturedMedia] = useState<{ blob: Blob; url: string; type: 'image' | 'video' } | null>(null);
    const [permissionError, setPermissionError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const { uploadFile, uploading: isUploading } = useMediaUpload();

    // Form stats
    const [caption, setCaption] = useState('');
    const [location, setLocation] = useState('');
    const [eventId, setEventId] = useState('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    let locationDebounceTimeout = useRef<NodeJS.Timeout | null>(null);

    const [isLocating, setIsLocating] = useState(false);
    const [locationResults, setLocationResults] = useState<any[]>([]);
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    
    // Premium FX States
    const [isFlashing, setIsFlashing] = useState(false);
    const [previewAnim, setPreviewAnim] = useState(false);

    useEffect(() => {
        if (step === 'CAMERA') {
            startCamera();
        } else {
            stopCamera();
        }
        if (step === 'PREVIEW') {
            setTimeout(() => setPreviewAnim(true), 10);
        } else {
            setPreviewAnim(false);
        }
        return () => stopCamera();
    }, [step, mode, facingMode]);

    const playShutterSound = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } catch (e) { /* silent fallback */ }
    };

    const startCamera = async () => {
        try {
            setPermissionError(null);
            stopCamera(); // Stop old stream if any
            const constraints = {
                video: { facingMode: facingMode },
                audio: mode === 'STORY'
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            mediaStreamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            setPermissionError('Não foi possível acessar a câmera. Por favor, verifique as permissões.');
        }
    };

    const stopCamera = () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;

        // Haptic Feedback
        if (navigator.vibrate) navigator.vibrate([15, 30, 15]);
        
        // Shutter Sound
        playShutterSound();

        // Flash Effect
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 120);

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    setTimeout(() => {
                        setCapturedMedia({ blob, url, type: 'image' });
                        setStep('PREVIEW');
                    }, 50);
                }
            }, 'image/jpeg', 0.8);
        }
    };
    
    const toggleCamera = () => {
        if (navigator.vibrate) navigator.vibrate(20);
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const type = file.type.startsWith('video') ? 'video' : 'image';
            const url = URL.createObjectURL(file);
            setCapturedMedia({ blob: file, url, type });
            setStep('PREVIEW');
        }
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocalização não suportada no seu dispositivo.');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    const data = await res.json();
                    const city = data.address.city || data.address.town || data.address.village;
                    const state = data.address.state;
                    
                    if (city && state) {
                        setLocation(`${city}, ${state}`);
                    } else if (data.display_name) {
                        setLocation(data.display_name.substring(0, 40));
                    } else {
                        setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                    }
                } catch (e) {
                    setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                }
                setIsLocating(false);
            },
            (err) => {
                setIsLocating(false);
                alert('Não foi possível obter sua localização. Verifique as permissões de GPS.');
            }
        );
    };

    const handleLocationSearch = (query: string) => {
        setLocation(query);
        if (!query || query.length < 3) {
            setLocationResults([]);
            return;
        }

        if (locationDebounceTimeout.current) clearTimeout(locationDebounceTimeout.current);
        
        locationDebounceTimeout.current = setTimeout(async () => {
            setIsSearchingLocation(true);
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=5&countrycodes=br`);
                const data = await res.json();
                setLocationResults(data || []);
            } catch (err) {
                console.error(err);
            }
            setIsSearchingLocation(false);
        }, 800);
    };

    const [publishError, setPublishError] = useState<string | null>(null);

    const handlePublish = async () => {
        if (!capturedMedia || !user || isUploading) return;
        setPublishError(null);

        try {
            // 0. Ensure profile exists (avoids FK violation on stories/posts)
            await supabase.from('profiles').upsert({
                id: user.id,
                name: user.name || user.email || 'Vaqueiro',
                email: user.email || null,
                username: user.username || (user.email || 'vaqueiro').split('@')[0].toLowerCase().replace(/\W/g, ''),
                role: user.role || 'USER',
            }, { onConflict: 'id', ignoreDuplicates: true });

            // 1. Upload to Storage using our unified hook with folders
            const folder = mode === 'STORY' ? 'stories_media' : 'posts_media';
            const publicUrl = await uploadFile(capturedMedia.blob as File, folder);

            if (!publicUrl) throw new Error("Falha ao obter URL pública da mídia.");

            // 2. Save to Database
            if (mode === 'STORY') {
                const { error: dbError } = await supabase
                    .from('stories')
                    .insert({
                        user_id: user.id,
                        media_url: publicUrl,
                        media_type: capturedMedia.type,
                        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                    });
                if (dbError) throw dbError;
            } else {
                const { error: dbError } = await supabase
                    .from('posts')
                    .insert({
                        user_id: user.id,
                        media_url: publicUrl,
                        media_type: capturedMedia.type,
                        caption,
                        location,
                        event_id: eventId || null
                    });
                if (dbError) throw dbError;
            }
            onSuccess();
        } catch (err: any) {
            console.error('Final publish error:', err);
            setPublishError(err.message || 'Ocorreu um erro ao enviar sua mídia. Tente novamente.');
        }
    };

    // Rendering methods (keeping the UI as is)
    const renderCamera = () => (
        <div className="fixed inset-0 h-[100dvh] bg-black z-[200] overflow-hidden">
            {isFlashing && (
                <div className="absolute inset-0 bg-white z-[300] transition-opacity duration-100 ease-out" style={{ opacity: isFlashing ? 0.8 : 0 }} />
            )}

            {/* Premium Depth Overlays */}
            <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10" />
            <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-10" />

            <div className="absolute inset-0 w-full h-full overflow-hidden">
                {permissionError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-neutral-900">
                        <span className="material-icons text-6xl text-white/20 mb-6">videocam_off</span>
                        <p className="text-sm font-bold text-white/60 mb-8">{permissionError}</p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-white text-black font-black py-4 px-8 rounded-full uppercase tracking-widest text-xs"
                        >
                            Selecionar da Galeria
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,video/*" />
                    </div>
                ) : (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                )}
            </div>

            <div className="absolute top-0 left-0 right-0 pt-[calc(env(safe-area-inset-top)+1.5rem)] px-6 pb-12 flex justify-between items-start z-50 pointer-events-none">
                <button onClick={onClose} className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white border border-white/20 pointer-events-auto active:scale-90 hover:bg-white/10 transition-all shadow-lg">
                    <span className="material-icons">close</span>
                </button>
                <button className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white border border-white/20 pointer-events-auto active:scale-90 hover:bg-white/10 transition-all shadow-lg">
                    <span className="material-icons">flash_off</span>
                </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-24 flex flex-col items-center z-50">
                <div className="flex justify-center gap-12 items-center mb-10 px-10 py-3 bg-black/40 backdrop-blur-2xl rounded-full border border-white/10 shadow-lg">
                    {(['FEED', 'STORY'] as Mode[]).map((m) => (
                        <button
                            key={m}
                            onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(10);
                                setMode(m);
                            }}
                            className={`text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative ${mode === m ? 'text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'text-white/40 hover:text-white/60'}`}
                        >
                            {m}
                            {mode === m && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white shadow-[0_0_4px_white]"></div>}
                        </button>
                    ))}
                </div>

                <div className="flex justify-center items-center gap-14 w-full px-8">
                    <button
                        onClick={() => {
                            if (navigator.vibrate) navigator.vibrate(10);
                            fileInputRef.current?.click();
                        }}
                        className="w-14 h-14 rounded-2xl border border-white/20 bg-black/30 backdrop-blur-md flex items-center justify-center text-white overflow-hidden active:scale-90 hover:bg-white/10 transition-all shadow-lg"
                    >
                        <span className="material-icons text-white/90">photo_library</span>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,video/*" />
                    </button>

                    <button
                        onClick={capturePhoto}
                        className="relative w-[88px] h-[88px] rounded-full border-[4px] border-white/40 p-1.5 flex items-center justify-center active:scale-[0.92] transition-all duration-200 shadow-[0_0_20px_rgba(0,0,0,0.4)] group overflow-visible"
                    >
                        <div className="absolute inset-[-6px] rounded-full border border-white/20 animate-ping opacity-20 pointer-events-none"></div>
                        <div className={`w-full h-full rounded-full transition-colors duration-200 shadow-inner ${mode === 'STORY' ? 'bg-gradient-to-tr from-[#ECA413] to-[#FF4500] shadow-[#ECA413]/50' : 'bg-white shadow-white/40'}`}></div>
                    </button>

                    <button 
                        onClick={toggleCamera}
                        className="w-14 h-14 rounded-full border border-white/20 bg-black/30 backdrop-blur-md flex items-center justify-center text-white active:scale-90 hover:bg-white/10 transition-all shadow-lg"
                    >
                        <span className="material-icons text-white/90">flip_camera_ios</span>
                    </button>
                </div>
                <p className="text-[9px] mt-8 font-bold text-white/30 uppercase tracking-widest animate-pulse opacity-50">
                    {mode === 'STORY' ? 'Toque para story' : 'Toque para capturar'}
                </p>
            </div>
        </div>
    );

    const renderPreview = () => (
        <div className={`absolute inset-0 bg-black flex flex-col z-[200] transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${previewAnim ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}>
            <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-neutral-900">
                {/* Blur backdrop overlay */}
                {capturedMedia?.type === 'image' && (
                    <div className="absolute inset-0 opacity-50 blur-[40px] scale-125 saturate-150" style={{ backgroundImage: `url(${capturedMedia.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                )}
                
                <div className={`relative z-10 w-full h-full flex items-center justify-center transition-transform duration-500 delay-100 ${previewAnim ? 'scale-100' : 'scale-95'}`}>
                    {capturedMedia?.type === 'video' ? (
                        <video src={capturedMedia.url} controls autoPlay loop className="w-full h-full object-cover shadow-2xl" />
                    ) : (
                        <img src={capturedMedia?.url} className="w-full h-full object-contain drop-shadow-2xl" alt="Captured" />
                    )}
                </div>
            </div>
            <div className="p-8 pb-12 bg-black flex gap-4">
                <button
                    onClick={() => { setCapturedMedia(null); setStep('CAMERA'); }}
                    className="flex-1 bg-white/10 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs border border-white/10"
                >
                    Refazer
                </button>
                <button
                    onClick={() => setStep('PUBLISH')}
                    className="flex-1 bg-[#ECA413] text-background-dark font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-[#ECA413]/20"
                >
                    Usar
                </button>
            </div>
        </div>
    );

    const renderPublish = () => (
        <div className="absolute inset-0 bg-background-dark flex flex-col z-[200]">
            <header className="px-6 py-4 flex items-center gap-4 border-b border-white/5">
                <button onClick={() => setStep('PREVIEW')} className="material-icons text-white/60">arrow_back</button>
                <h2 className="text-white font-black uppercase text-sm italic tracking-tight">Finalizar Postagem</h2>
            </header>
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="flex gap-4">
                    <div className="w-24 h-32 rounded-xl overflow-hidden bg-neutral-900 border border-white/10 shrink-0">
                        {capturedMedia?.type === 'video' ? (
                            <video src={capturedMedia.url} className="w-full h-full object-cover" />
                        ) : (
                            <img src={capturedMedia?.url} className="w-full h-full object-cover" alt="Thumb" />
                        )}
                    </div>
                    <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Escreva uma legenda..."
                        className="flex-1 bg-transparent text-white text-sm outline-none resize-none pt-2 placeholder:text-white/20"
                    />
                </div>
                <div className="space-y-4">
                    <div className="relative">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                            <span className="material-icons text-[#ECA413]">place</span>
                            <input
                                value={location}
                                onChange={(e) => handleLocationSearch(e.target.value)}
                                placeholder="Adicionar localização (opcional)"
                                className="bg-transparent flex-1 text-xs text-white outline-none placeholder:text-white/20"
                            />
                            {!location && (
                                <button 
                                    onClick={handleGetLocation}
                                    className={`material-icons text-white/40 hover:text-white active:scale-90 transition-transform ${isLocating ? 'animate-pulse text-[#ECA413]' : ''}`}
                                >
                                    my_location
                                </button>
                            )}
                        </div>
                        
                        {locationResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-white/10 rounded-xl overflow-hidden z-[250] shadow-2xl max-h-48 overflow-y-auto">
                                {isSearchingLocation && (
                                    <div className="p-3 text-center text-xs text-white/50">Buscando...</div>
                                )}
                                {locationResults.map((loc: any, idx: number) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            const shortName = loc.display_name.split(',')[0];
                                            setLocation(shortName);
                                            setLocationResults([]);
                                        }}
                                        className="w-full text-left p-4 border-b border-white/5 hover:bg-white/5 active:bg-white/10 flex flex-col gap-1 transition-colors"
                                    >
                                        <span className="text-white text-xs font-bold line-clamp-1">{loc.display_name.split(',')[0]}</span>
                                        <span className="text-white/40 text-[10px] line-clamp-1">{loc.display_name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="p-6 bg-background-dark border-t border-white/5 space-y-4">
                {publishError && (
                    <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start gap-3">
                        <span className="material-icons text-red-500 text-sm mt-0.5">error_outline</span>
                        <p className="text-red-200 text-xs flex-1">{publishError}</p>
                        <button onClick={() => setPublishError(null)} className="material-icons text-white/50 text-sm hover:text-white">close</button>
                    </div>
                )}
                <button
                    onClick={handlePublish}
                    disabled={isUploading}
                    className="w-full bg-[#ECA413] text-background-dark font-black py-5 rounded-2xl uppercase tracking-widest text-sm shadow-xl shadow-[#ECA413]/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                    {isUploading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-background-dark border-t-transparent rounded-full animate-spin" />
                            <span>Publicando...</span>
                        </>
                    ) : (
                        <>
                            <span className="material-icons">send</span>
                            <span>Publicar na Arena</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );

    return (
        <>
            {step === 'CAMERA' && renderCamera()}
            {step === 'PREVIEW' && renderPreview()}
            {step === 'PUBLISH' && renderPublish()}
        </>
    );
};

export default MediaCreationView;
