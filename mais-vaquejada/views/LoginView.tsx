import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface LoginViewProps {
  onLogin: (userData: any) => void;
  onSignUp: () => void;
  onForgotPassword: () => void;
  onRecoveryAssisted: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, onSignUp, onForgotPassword, onRecoveryAssisted }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLegacyLogin, setShowLegacyLogin] = useState(false);

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

  const handleAppleLogin = async () => {
    setAppleLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar com Apple');
      setAppleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('E-mail e senha são obrigatórios.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : 'Erro ao entrar. Tente novamente.');
        setLoading(false);
        return;
      }

      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          // If profile is missing, create a default one on the fly
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              name: data.user.email?.split('@')[0] || 'Novo Vaqueiro',
              email: data.user.email,
              role: 'USER'
            })
            .select()
            .single();

          if (createError) {
            setError('Erro ao criar perfil inicial. Tente novamente.');
            setLoading(false);
            return;
          }
          onLogin(newProfile);
        } else {
          onLogin(profile);
        }
      }
    } catch (err) {
      setError('Erro de conexão com a Arena.');
    } finally {
      if (!error) setLoading(false);
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
              disabled={googleLoading || appleLoading}
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
              onClick={handleAppleLogin}
              disabled={googleLoading || appleLoading}
              className="w-full bg-black text-white border border-white/20 py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {appleLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg">
                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.3 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.3zM207.8 116.6c-20.9 22.3-51.5 35.5-80.4 33.3 4.2-33 19.3-59.3 39.8-77.9 19.7-18.5 48.4-32.9 76.1-34.9-3.4 34.1-15 60.1-35.5 79.5z"/>
                  </svg>
                  CONTINUAR COM APPLE
                </>
              )}
            </button>

            <div className="flex items-center gap-4 py-2">
              <div className="flex-1 h-[1px] bg-white/10" />
              <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">OU</span>
              <div className="flex-1 h-[1px] bg-white/10" />
            </div>

            {!showLegacyLogin ? (
              <button
                onClick={() => setShowLegacyLogin(true)}
                className="w-full bg-white/5 border border-white/10 text-white/60 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.15em] active:scale-95 transition-all"
              >
                ENTRAR COM E-MAIL
              </button>
            ) : (
              <form onSubmit={handleLogin} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#ECA413] ml-2">Seu E-mail</label>
                  <div className="relative group">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 material-icons text-white/20 group-focus-within:text-[#ECA413] transition-colors">alternate_email</span>
                    <input
                      type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-sm font-bold text-white focus:outline-none focus:border-[#ECA413] focus:bg-white/10 transition-all"
                      placeholder="exemplo@email.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#ECA413]">Sua Senha</label>
                  </div>
                  <div className="relative group">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 material-icons text-white/20 group-focus-within:text-[#ECA413] transition-colors">lock</span>
                    <input
                      type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-12 text-sm font-bold text-white focus:outline-none focus:border-[#ECA413] focus:bg-white/10 transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-[#ECA413]"
                    >
                      <span className="material-icons text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <button
                    disabled={loading}
                    className="w-full bg-[#ECA413] hover:bg-[#B47B09] text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>ENTRAR NA ARENA <span className="material-icons text-sm">rocket_launch</span></>}
                  </button>
                  
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-[#ECA413] text-center"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-4">
            <button
              onClick={onSignUp}
              className="w-full py-2 text-center text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-white transition-colors"
            >
              Não tem uma conta? <span className="text-[#ECA413]">Crie agora</span>
            </button>
            
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
