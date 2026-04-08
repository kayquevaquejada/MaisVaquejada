import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SignUpViewProps {
  onBack: () => void;
  onSuccess: (userData: any) => void;
}

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const SignUpView: React.FC<SignUpViewProps> = ({ onBack, onSuccess }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cities, setCities] = useState<any[]>([]);

  useEffect(() => {
    if (selectedState) {
      fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState}/municipios?orderBy=nome`)
        .then(res => res.json())
        .then(data => setCities(data))
        .catch(err => console.error('Error fetching cities:', err));
    }
  }, [selectedState]);

  const [verificationNeeded, setVerificationNeeded] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !email || !password || !confirmPassword) {
      setError('Preencha todos os campos.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Auth Sign Up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Create Profile
        const profileData = {
          id: authData.user.id,
          full_name: name,
          display_name: name.split(' ')[0],
          username: username.toLowerCase().trim().replace(/@/g, ''),
          email,
          phone,
          state_id: selectedState,
          city_id: selectedCity,
          role: 'USER',
          status: 'PENDING_PROFILE'
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .insert(profileData);

        if (profileError) {
          console.error('Error creating profile:', profileError);
          // If profile fails, it might be RLS, but we checked that.
        }

        if (!authData.session) {
          // Email confirmation is enabled in Supabase
          setVerificationNeeded(true);
        } else {
          onSuccess(profileData);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-[#0F0A05] relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0A05] via-[#0F0A05]/80 to-transparent z-10" />
        <img
          src="https://images.unsplash.com/photo-1598974357851-98166a9d9b56?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
          className="w-full h-1/2 object-cover opacity-30"
          alt="Vaquejada"
        />
      </div>

      <div className="relative z-20 flex-1 flex flex-col px-8 py-10 overflow-y-auto hide-scrollbar">
        {verificationNeeded ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 rounded-full bg-[#ECA413]/10 border border-[#ECA413]/20 flex items-center justify-center mb-8">
              <span className="material-icons text-[#ECA413] text-5xl animate-bounce">mark_email_read</span>
            </div>
            <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-4">Verifique seu <span className="text-[#ECA413]">E-mail</span></h2>
            <p className="text-white/60 text-sm font-bold leading-relaxed mb-10">
              Enviamos um link de confirmação para <span className="text-white font-black">{email}</span>. Acesse seu e-mail para ativar sua conta na Arena.
            </p>
            <button
              onClick={onBack}
              className="w-full bg-white/5 border border-white/10 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all"
            >
              VOLTAR PARA O LOGIN
            </button>
          </div>
        ) : (
          <>
            <button onClick={onBack} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 mb-10 active:scale-90 transition-all">
              <span className="material-icons text-white">arrow_back</span>
            </button>

            <h1 className="text-4xl font-black text-white italic tracking-tighter mb-2 uppercase">Junte-se à <span className="text-[#ECA413]">Tropa</span></h1>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-10">Faça parte da maior arena digital de vaquejada</p>

            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: window.location.origin }
                  });
                  if (error) throw error;
                } catch (err: any) {
                  setError(err.message || 'Erro ao entrar com Google');
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full bg-white text-black py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mb-6"
            >
              {loading ? (
                 <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  CRIAR COM GOOGLE
                </>
              )}
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-[1px] bg-white/10" />
              <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">OU COM E-MAIL</span>
              <div className="flex-1 h-[1px] bg-white/10" />
            </div>

            <form onSubmit={handleSignUp} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#ECA413] ml-2">Nome Completo</label>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:border-[#ECA413]"
                  placeholder="Ex: João Vaqueiro"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#ECA413] ml-2">@ Nome de Usuário (Exclusivo)</label>
                <input
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:border-[#ECA413]"
                  placeholder="Ex: kayquegusmao"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#ECA413] ml-2">E-mail</label>
                <input
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:border-[#ECA413]"
                  placeholder="exemplo@email.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#ECA413] ml-2">Estado</label>
                  <select
                    value={selectedState} onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:border-[#ECA413] appearance-none"
                  >
                    <option value="" className="bg-[#1A1108]">UF</option>
                    {STATES.map(s => <option key={s} value={s} className="bg-[#1A1108]">{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#ECA413] ml-2">Cidade</label>
                  <select
                    value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:border-[#ECA413] appearance-none"
                  >
                    <option value="" className="bg-[#1A1108]">Selecione</option>
                    {cities.map(c => <option key={c.id} value={c.nome} className="bg-[#1A1108]">{c.nome.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#ECA413] ml-2">Senha de Acesso</label>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-12 text-sm font-bold text-white focus:outline-none focus:border-[#ECA413]"
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

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#ECA413] ml-2">Confirmar Senha</label>
                <div className="relative group">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-12 text-sm font-bold text-white focus:outline-none focus:border-[#ECA413]"
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

              {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center mt-2">{error}</p>}

              <div className="pt-6">
                <button
                  disabled={loading}
                  className="w-full bg-[#ECA413] text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "CRIAR MINHA CONTA"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default SignUpView;
