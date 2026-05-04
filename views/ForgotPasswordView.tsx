
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ForgotPasswordViewProps {
  onBack: () => void;
}

const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isResetStep, setIsResetStep] = useState(false);

  useEffect(() => {
    // Check if we are in a recovery flow (URL contains recovery hash)
    if (window.location.hash && window.location.hash.includes('type=recovery')) {
      setIsResetStep(true);
    }
  }, []);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Enviamos as instruções para o seu e-mail!' });
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Senha atualizada com sucesso! Você já pode entrar.' });
      setTimeout(() => onBack(), 2000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-full flex flex-col bg-[#0F0A05] relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20">
        <img
          src="https://images.unsplash.com/photo-1534067783941-51c9c23ecefd?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
          className="w-full h-full object-cover blur-sm"
          alt="Arena"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0A05] to-transparent" />
      </div>

      <div className="relative z-20 flex-1 flex flex-col px-8 py-20 justify-center">
        <button onClick={onBack} className="absolute top-10 left-8 w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 active:scale-95">
          <span className="material-icons text-white">arrow_back</span>
        </button>

        <div className="max-w-md mx-auto w-full">
          <h1 className="text-4xl font-black text-white italic tracking-tighter mb-2 uppercase">
            {isResetStep ? 'Criar Nova' : 'Recuperar'} <span className="text-[#ECA413]">Senha</span>
          </h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-10 leading-snug">
            {isResetStep 
              ? 'Digite sua nova senha de acesso à Arena.' 
              : 'Não se preocupe, vamos te ajudar a voltar para a sela.'}
          </p>

          <div className="bg-[#1A1108]/80 backdrop-blur-2xl rounded-[40px] p-8 border border-white/5 shadow-2xl">
            {message && (
              <div className={`mb-6 p-4 rounded-2xl text-xs font-bold uppercase tracking-tight flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
                message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}>
                <span className="material-icons text-lg">{message.type === 'success' ? 'check_circle' : 'error'}</span>
                {message.text}
              </div>
            )}

            {!isResetStep ? (
              <form onSubmit={handleRequestReset} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#ECA413] ml-2">E-mail Cadastrado</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-sm font-bold text-white focus:outline-none focus:border-[#ECA413]"
                    placeholder="voce@email.com"
                  />
                </div>
                <button
                  disabled={loading}
                  className="w-full bg-[#ECA413] text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? 'ENVIANDO...' : 'ENVIAR INSTRUÇÕES'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleUpdatePassword} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#ECA413] ml-2">Nova Senha</label>
                  <div className="relative group">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-6 pr-12 text-sm font-bold text-white focus:outline-none focus:border-[#ECA413]"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-[#ECA413]"
                    >
                      <span className="material-icons text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#ECA413] ml-2">Confirmar Nova Senha</label>
                  <div className="relative group">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-6 pr-12 text-sm font-bold text-white focus:outline-none focus:border-[#ECA413]"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-[#ECA413]"
                    >
                      <span className="material-icons text-lg">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>
                <button
                  disabled={loading}
                  className="w-full bg-[#ECA413] text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? 'ATUALIZANDO...' : 'DEFINIR SENHA'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordView;
