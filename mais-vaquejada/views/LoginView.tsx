import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface LoginViewProps {
  onLogin: (userData: any) => void;
  onSignUp: () => void;
  onForgotPassword: () => void;
  onRecoveryAssisted: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, onSignUp, onForgotPassword, onRecoveryAssisted }) => {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar com Google');
      setGoogleLoading(false);
    }
  };


  return (
    <div className="min-h-full flex flex-col bg-[#0F0A05] relative overflow-hidden">
      {/* Background Cinematográfico - Cavalos/Vaquejada */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-[#0F0A05] z-10" />
        <img
          src="https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
          className="w-full h-full object-cover scale-110 animate-pulse duration-[10000ms]"
          alt="Vaquejada Background"
        />
      </div>

      <div className="relative z-20 flex-1 flex flex-col px-8 py-12 justify-center">
        {/* Header Wow Factor */}
        <div className="mb-12 text-center animate-in fade-in slide-in-from-top-10 duration-1000">
          <div className="inline-block px-4 py-1.5 rounded-full bg-[#ECA413]/10 border border-[#ECA413]/20 mb-6">
            <span className="text-[#ECA413] text-[10px] font-black uppercase tracking-[0.3em]">Arena Digital Oficial</span>
          </div>
          <h1 className="text-6xl font-black text-white italic tracking-tighter leading-none mb-2">
            +VAQUE<span className="text-[#ECA413]">JADA</span>
          </h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest italic">A maior paixão do Nordeste em um só lugar</p>
        </div>

        {/* Form Card */}
        <div className="bg-[#1A1108]/80 backdrop-blur-2xl rounded-[40px] p-8 border border-white/5 shadow-[0_25px_100px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in duration-700 delay-300">
          <h2 className="text-xl font-black text-white uppercase italic tracking-tight mb-8 text-center">Acesse a Arena</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-right duration-300">
              <span className="material-icons text-red-500 text-lg">error_outline</span>
              <p className="text-xs text-red-200 font-bold uppercase tracking-tight">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full bg-white text-black py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  CONTINUAR COM GOOGLE
                </>
              )}
            </button>

            <button
               id="guest-mode-btn"
               onClick={() => {
                 onLogin({ 
                   id: 'guest_user', 
                   email: 'convidado@arena.com',
                   user_metadata: { full_name: 'Visitante Arena' }
                 });
               }}
               className="w-full border-2 border-[#ECA413]/50 text-[#ECA413] py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] animate-pulse shadow-lg shadow-[#ECA413]/20 mt-4 active:scale-95 transition-all"
            >
              ENTRAR EM MODO VISITANTE (PARA TESTE LOCAL)
            </button>
          </div>

          <div className="mt-8 flex flex-col gap-4">
            
            <button
              onClick={onRecoveryAssisted}
              className="w-full py-2 text-center text-[10px] font-black text-[#ECA413]/60 uppercase tracking-widest hover:text-[#ECA413] transition-colors"
            >
              Problemas para entrar? <span className="underline">Falar com suporte</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
