import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import LoginPremiumPartners from '../components/LoginPremiumPartners';

interface LoginViewProps {
  onLogin: (userData: any) => void;
  onSignUp: () => void;
  onForgotPassword: () => void;
  onRecoveryAssisted: () => void;
  onTerms: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, onSignUp, onForgotPassword, onRecoveryAssisted, onTerms }) => {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const DEFAULT_BG = 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80';
  const [loginBg, setLoginBg] = useState(DEFAULT_BG);

  useEffect(() => {
    // Carregar Background
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'login_bg_url')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value?.url) setLoginBg(data.value.url);
      });
  }, []);

  const handleAppleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const isNative = Capacitor.isNativePlatform();
      const redirectTo = isNative 
        ? 'com.maisvaquejada.app://' 
        : window.location.origin;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectTo
        }
      });
      if (error) throw error;
    } catch (err: any) {
      if (err?.message?.includes('cancelled') || err?.message?.includes('cancel')) return;
      console.error('[AppleLogin] Error:', err);
      setError(err.message || 'Erro ao entrar com Apple');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const isNative = Capacitor.isNativePlatform();
      const redirectTo = isNative 
        ? 'com.maisvaquejada.app://' 
        : window.location.origin;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('[GoogleLogin] Error:', err);
      setError(err.message || 'Erro ao entrar com Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-[#0F0A05] relative overflow-hidden">
      {/* Background Cinematográfico */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-[#0F0A05] z-10" />
        <img
          src={loginBg}
          className="w-full h-full object-cover scale-110 animate-pulse duration-[10000ms]"
          alt="Vaquejada Background"
        />
      </div>

      <div className="relative z-20 flex-1 flex flex-col px-8 pt-12 pb-6 overflow-y-auto">
        {/* Header */}
        <div className="mb-10 text-center animate-in fade-in slide-in-from-top-10 duration-1000">
          <div className="inline-block px-4 py-1.5 rounded-full bg-[#ECA413]/10 border border-[#ECA413]/20 mb-6">
            <span className="text-[#ECA413] text-[10px] font-black uppercase tracking-[0.3em]">Arena Digital Oficial</span>
          </div>
          <div className="flex justify-center mb-4">
            <p className="font-black tracking-tighter italic leading-none flex items-baseline">
              <span className="text-[#ECA413]" style={{ fontSize: '3.5rem', lineHeight: 1, marginRight: '-0.1em' }}>+V</span>
              <span className="text-white text-[2.2rem] tracking-tight">AQUEJADA</span>
            </p>
          </div>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] italic">A maior paixão do Nordeste em um só lugar</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#1A1108]/80 backdrop-blur-2xl rounded-[40px] p-8 border border-white/5 shadow-[0_25px_100px_rgba(0,0,0,0.8)] mb-10">
          <h2 className="text-lg font-black text-white uppercase italic tracking-tight mb-8 text-center">Acesse a Arena</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
              <span className="material-icons text-red-500 text-lg">error_outline</span>
              <p className="text-[10px] text-red-200 font-bold uppercase tracking-tight">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="w-full bg-white text-black py-4 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
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
              onClick={handleAppleLogin}
              disabled={googleLoading || loading}
              className="w-full bg-black text-white border border-white/10 py-4 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="material-icons text-lg">apple</span>
                  ENTRAR COM APPLE ID
                </>
              )}
            </button>
          </div>

          <div className="mt-8 flex flex-col gap-4">
            <p className="text-[8px] text-white/30 text-center font-bold uppercase tracking-widest leading-relaxed px-4">
              Ao entrar, você concorda com nossos <br />
              <button onClick={onTerms} className="underline text-white/50">Termos de Uso</button> e <button onClick={onTerms} className="underline text-white/50">EULA</button>
            </p>
          </div>
        </div>
      </div>

      {/* Módulo Premium de Parceiros - Fora do scroll para evitar bugs no iOS */}
      <LoginPremiumPartners />
    </div>
  );
};

export default LoginView;
