import React, { useState, useEffect } from 'react';
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
  const DEFAULT_BG = 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
  const [loginBg, setLoginBg] = useState(DEFAULT_BG);

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'login_bg_url')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value?.url) setLoginBg(data.value.url);
      });
  }, []);

  const handleDevLogin = () => {
    // ID do usuário "kayquegusmao" para testes locais
    onLogin({ id: 'e417ceb0-b306-4156-87a6-32e459afb4eb' });
  };


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
          src={loginBg}
          className="w-full h-full object-cover scale-110 animate-pulse duration-[10000ms]"
          alt="Vaquejada Background"
        />
      </div>

      <div className="relative z-20 flex-1 flex flex-col px-8 justify-center" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top, 3rem))', paddingBottom: '3rem' }}>
        {/* Header Wow Factor */}
        <div className="mb-12 text-center animate-in fade-in slide-in-from-top-10 duration-1000">
          <div className="inline-block px-4 py-1.5 rounded-full bg-[#ECA413]/10 border border-[#ECA413]/20 mb-6">
            <span className="text-[#ECA413] text-[10px] font-black uppercase tracking-[0.3em]">Arena Digital Oficial</span>
          </div>
          <div className="flex justify-center mb-4">
            <p className="font-black tracking-tighter italic leading-none flex items-baseline">
              <span className="text-[#ECA413]" style={{ fontSize: '4rem', lineHeight: 1, marginRight: '-0.1em' }}>+V</span>
              <span className="text-white text-[2.5rem] tracking-tight">AQUEJADA</span>
            </p>
          </div>
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

            {/* Botões ocultos por solicitação do administrador */}
            {/* 
            <button
              onClick={handleDevLogin}
              className="w-full bg-[#ECA413] text-black py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <span className="material-icons">terminal</span>
              ENTRAR COMO DESENVOLVEDOR (LOCAL)
            </button>

            <div className="flex items-center gap-4 my-2">
              <div className="flex-1 h-[1px] bg-white/5" />
              <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">OU</span>
              <div className="flex-1 h-[1px] bg-white/5" />
            </div>

            <button
              onClick={onSignUp}
              className="w-full bg-white/5 border border-white/10 text-white py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 active:scale-95 transition-all"
            >
              CRIAR CONTA NA ARENA
            </button>
            */}

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
