
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface CompleteProfileViewProps {
  user: User | null;
  onComplete: () => void;
  onLogout: () => void;
}

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const CompleteProfileView: React.FC<CompleteProfileViewProps> = ({ user, onComplete, onLogout }) => {
  const [fullName, setFullName] = useState(user?.full_name || user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [selectedState, setSelectedState] = useState(user?.state_id || '');
  const [selectedCity, setSelectedCity] = useState(user?.city_id || '');
  const [cities, setCities] = useState<any[]>([]);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [suggestions, setSuggestions] = useState<string[]>([]);
 
   const generateSuggestions = (baseEmail: string) => {
     const prefix = baseEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
     return [
       `${prefix}_v${Math.floor(Math.random() * 99)}`,
       `${prefix}_arena`,
       `v_${prefix}`
     ];
   };

  useEffect(() => {
    if (selectedState) {
      fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState}/municipios?orderBy=nome`)
        .then(res => res.json())
        .then(data => setCities(data))
        .catch(err => console.error('Error fetching cities:', err));
    }
  }, [selectedState]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !username || !phone || !selectedState || !selectedCity) {
      setError('Todos os campos são obrigatórios.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if username is already taken
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase().trim())
        .neq('id', user?.id) // Don't match self
        .maybeSingle();
      
      if (existing) {
          setError('Este @apelido já existe. Escolha outro ou uma das sugestões:');
          const email = user?.email || 'vaqueiro@gmail.com';
          setSuggestions(generateSuggestions(email));
          setLoading(false);
          return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          display_name: fullName.split(' ')[0],
          username: username.toLowerCase().trim(),
          phone: phone,
          state_id: selectedState,
          state_name: selectedState, // Simplification
          city_id: selectedCity,
          city_name: selectedCity,
          profile_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      onComplete();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar perfil.');
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 11) {
      return digits.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
                 .replace(/^(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return digits.substring(0, 11);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0F0A05] relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0A05] via-[#0F0A05]/80 to-transparent z-10" />
        <img
          src="https://images.unsplash.com/photo-1598974357851-98166a9d9b56?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
          className="w-full h-1/2 object-cover opacity-20"
          alt="Vaquejada"
        />
      </div>

      <div className="relative z-20 flex-1 flex flex-col px-8 py-12 overflow-y-auto hide-scrollbar">
        <div className="flex justify-between items-center mb-10">
            <div>
                <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-1">Quase <span className="text-[#ECA413]">Lá!</span></h1>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">Complete seu cadastro para entrar na Arena</p>
            </div>
            <button onClick={onLogout} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-red-500 transition-colors">
                <span className="material-icons text-lg">logout</span>
            </button>
        </div>

        <div className="bg-[#1A1108]/60 backdrop-blur-xl rounded-[32px] p-8 border border-white/5 shadow-2xl">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#ECA413] ml-2">Nome Completo</label>
                <input
                  type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:border-[#ECA413] transition-all"
                  placeholder="Seu nome completo"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#ECA413] ml-2">Nome de Usuário (@apelido)</label>
                <input
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:border-[#ECA413] transition-all"
                  placeholder="Como quer ser chamado"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#ECA413] ml-2">WhatsApp / Telefone (Apenas Números)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const onlyNums = e.target.value.replace(/\D/g, '');
                    setPhone(onlyNums);
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:border-[#ECA413] transition-all"
                  placeholder="EX: 81900000000"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#ECA413] ml-2">Estado (UF)</label>
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

              {error && (
                <div className="space-y-3">
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                    <span className="material-icons text-red-500 text-sm">error_outline</span>
                    <p className="text-[10px] text-red-200 font-black uppercase tracking-tight">{error}</p>
                  </div>
                  
                  {suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-2">
                       {suggestions.map(s => (
                         <button 
                           key={s} 
                           type="button"
                           onClick={() => { setUsername(s); setSuggestions([]); setError(null); }}
                           className="bg-white/5 border border-white/10 px-3 py-2 rounded-full text-[10px] font-bold text-[#ECA413] hover:bg-[#ECA413] hover:text-black transition-all"
                         >
                           @{s}
                         </button>
                       ))}
                    </div>
                  )}
                </div>
              )}

              <button
                disabled={loading}
                className="w-full bg-[#ECA413] hover:bg-[#B47B09] text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>CONCLUIR CADASTRO <span className="material-icons text-sm">check_circle</span></>}
              </button>
            </form>
        </div>
        
        <p className="mt-10 text-center text-[10px] text-white/20 font-bold uppercase tracking-[0.2em] leading-relaxed">
            Ao clicar em concluir, você concorda com nossos <br/> <span className="text-white/40 underline">Termos de Uso</span> e <span className="text-white/40 underline">Política de Privacidade</span>.
        </p>
      </div>
    </div>
  );
};

export default CompleteProfileView;
