import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { View } from '../types';

const GuestCTA: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show nothing while checking auth or if authenticated
  if (isAuthenticated === null || isAuthenticated) {
    return null;
  }

  const handleLogin = () => {
    window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view: View.LOGIN } }));
  };

  const handleSignUp = () => {
    window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view: View.SIGNUP } }));
  };

  return (
    <div className="w-full px-6 my-6 animate-in fade-in duration-700">
      <div className="relative overflow-hidden rounded-[32px] bg-[#1A1108] border border-[#D4AF37]/20 p-6 shadow-2xl">
        {/* Glow Effects */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#8C7323] flex items-center justify-center mb-4 shadow-lg shadow-[#D4AF37]/20">
            <span className="material-icons text-background-dark">star</span>
          </div>
          
          <h2 className="text-xl font-black text-white uppercase tracking-tighter italic mb-2">
            Desbloqueie novas <span className="text-[#D4AF37]">funcionalidades</span>
          </h2>
          
          <p className="text-white/60 text-sm mb-6 leading-relaxed max-w-sm">
            Crie sua conta gratuita para salvar eventos, participar da comunidade e acessar recursos exclusivos do +Vaquejada.
          </p>
          
          <div className="flex flex-col sm:flex-row w-full gap-3 sm:justify-center">
            <button 
              onClick={handleSignUp}
              className="bg-gradient-to-r from-[#D4AF37] to-[#ECA413] text-black px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-[#D4AF37]/20 flex-1 sm:flex-none"
            >
              Criar Conta
            </button>
            <button 
              onClick={handleLogin}
              className="bg-white/5 border border-white/10 text-white px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all flex-1 sm:flex-none"
            >
              Entrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestCTA;
