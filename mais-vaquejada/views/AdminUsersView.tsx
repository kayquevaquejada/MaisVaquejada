
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface AdminUsersViewProps {
  user: User | null;
}

const AdminUsersView: React.FC<AdminUsersViewProps> = ({ user }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterState, setFilterState] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);

  const isAdminMaster = user?.role === 'ADMIN_MASTER' || user?.email === 'kayquegusmao@icloud.com' || user?.email === 'kayquegusmao1@gmail.com';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mapped: User[] = (data || []).map(p => ({
        id: p.id,
        name: p.full_name || p.name || 'Sem Nome',
        email: p.email || '',
        phone: p.phone || p.whatsapp || '',
        state_id: p.state_id || '',
        state_name: p.state_name || '',
        city_id: p.city_id || '',
        city_name: p.city_name || '',
        type: 'common',
        role: p.role,
        status: p.status,
        profile_completed: p.profile_completed,
        is_verified: p.is_verified,
        can_add_vaquejada: p.can_add_vaquejada,
        signup_provider: p.signup_provider,
        username: p.username,
        avatar_url: p.avatar_url,
        createdAt: p.created_at,
        blocked: p.status === 'BLOCKED',
        isMaster: p.role === 'ADMIN_MASTER',
        permissions: p.can_add_vaquejada ? ['organize_event'] : [],
        trustLevel: 'normal'
      }));

      setUsers(mapped);
    } catch (err: any) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (userId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', userId);
      if (error) throw error;
      fetchUsers();
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  const handleToggleVerify = async (userId: string, verified: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: verified })
        .eq('id', userId);
      if (error) throw error;
      fetchUsers();
    } catch (err: any) {
        alert('Erro: ' + err.message);
    }
  };

  const handleToggleVaquejadaPerm = async (userId: string, perm: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ can_add_vaquejada: perm })
        .eq('id', userId);
      if (error) throw error;
      fetchUsers();
    } catch (err: any) {
        alert('Erro: ' + err.message);
    }
  };

  const handleGenerateRecovery = async (targetUser: User) => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    try {
        // 1. Create token in DB
        // In a real app, this should be a secure hashed token
        const { error } = await supabase
            .from('account_recovery_tokens')
            .insert({
                user_id: targetUser.id,
                token_hash: code, // Simulation: storing clear text for demo if we don't have crypto locally, but PG trigger could hash it
                expires_at: new Date(Date.now() + 15 * 60000).toISOString(),
                status: 'ACTIVE',
                created_by_admin_id: user?.id
            });
        
        if (error) throw error;
        
        setRecoveryCode(code);
        setIsRecoveryModalOpen(true);
        
        // Log action
        await supabase.from('security_audit_logs').insert({
            user_id: targetUser.id,
            event_type: 'RECOVERY_TOKEN_GENERATED',
            performed_by: user?.id,
            metadata: { code_generated: 'CODE_HIDDEN' }
        });
    } catch (err: any) {
        alert('Erro: ' + err.message);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone.includes(searchTerm);
    
    const matchesRole = filterRole === 'ALL' || u.role === filterRole;
    const matchesStatus = filterStatus === 'ALL' || u.status === filterStatus;
    const matchesState = filterState === 'ALL' || u.state_id === filterState;

    return matchesSearch && matchesRole && matchesStatus && matchesState;
  });

  return (
    <div className="min-h-full bg-[#0F0A05] text-white flex flex-col p-6 animate-in fade-in duration-500">
      <header className="mb-8">
        <div className="flex justify-between items-start mb-4">
            <div>
                <h1 className="text-3xl font-black italic tracking-tighter uppercase">Gestão de <span className="text-[#ECA413]">Usuários</span></h1>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Controle Total da Base +Vaquejada</p>
            </div>
            <button onClick={fetchUsers} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                <span className={`material-icons text-white/40 ${loading ? 'animate-spin' : ''}`}>refresh</span>
            </button>
        </div>

        {/* Filters Panel */}
        <div className="bg-[#1A1108]/60 backdrop-blur-xl border border-white/5 p-4 rounded-3xl space-y-4 shadow-xl">
            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons text-white/20">search</span>
                <input 
                    type="text" 
                    placeholder="Nome, e-mail, @username ou telefone..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-white focus:outline-none focus:border-[#ECA413] transition-all"
                />
            </div>
            
            <div className="grid grid-cols-3 gap-3">
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest text-white outline-none appearance-none">
                    <option value="ALL">Cargo</option>
                    <option value="USER">Usuário</option>
                    <option value="ADMIN_LOCAL">Admin Local</option>
                    <option value="ADMIN_MASTER">Admin Master</option>
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest text-white outline-none appearance-none">
                    <option value="ALL">Status</option>
                    <option value="ACTIVE">Ativo</option>
                    <option value="PENDING_PROFILE">Incompleto</option>
                    <option value="BLOCKED">Bloqueado</option>
                </select>
                <select value={filterState} onChange={(e) => setFilterState(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest text-white outline-none appearance-none">
                    <option value="ALL">Estado</option>
                    {Array.from(new Set(users.map(u => u.state_id))).filter(Boolean).map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
            </div>
        </div>
      </header>

      {/* Users List */}
      <div className="flex-1 space-y-4 pb-20">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/20 px-2 flex justify-between">
            <span>Resultados ({filteredUsers.length})</span>
            {loading && <span className="animate-pulse">Sincronizando...</span>}
        </h3>

        {filteredUsers.map(u => (
            <div key={u.id} className="bg-[#1A1108]/40 border border-white/5 rounded-3xl p-5 hover:border-white/10 transition-all group">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden">
                            {u.avatar_url ? (
                                <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <span className="material-icons text-white/10 text-3xl">person</span>
                            )}
                            {u.is_verified && <span className="absolute -bottom-1 -right-1 material-icons text-[16px] text-blue-400">verified</span>}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-black text-white text-base tracking-tight">{u.name}</h4>
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                                    u.role === 'ADMIN_MASTER' ? 'bg-[#ECA413] text-black' : 
                                    u.role === 'ADMIN_LOCAL' ? 'bg-[#ECA413]/20 text-[#ECA413]' : 
                                    'bg-white/10 text-white/40'
                                }`}>{u.role}</span>
                            </div>
                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{u.email}</p>
                            <p className="text-[9px] text-white/20 font-bold mt-1">ID: {u.id.substring(0, 8)}...</p>
                        </div>
                    </div>
                    
                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        u.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500' :
                        u.status === 'BLOCKED' ? 'bg-red-500/10 text-red-500' :
                        'bg-yellow-500/10 text-yellow-500'
                    }`}>
                        {u.status}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[10px] font-bold uppercase tracking-widest text-white/40 mb-5 pb-5 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <span className="material-icons text-xs">location_on</span>
                        {u.city_name || u.city_id || 'Não inf.'}, {u.state_id || '??'}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="material-icons text-xs">phone</span>
                        {u.phone || 'Não inf.'}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="material-icons text-xs">calendar_today</span>
                        ADM: {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="material-icons text-xs">login</span>
                        {u.signup_provider || 'email'}
                    </div>
                </div>

                {/* Actions Grid */}
                {isAdminMaster && (
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => handleUpdateStatus(u.id, u.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED')}
                            disabled={u.isMaster}
                            className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                u.status === 'BLOCKED' ? 'bg-green-500 text-white' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}
                        >
                            <span className="material-icons text-xs">{u.status === 'BLOCKED' ? 'lock_open' : 'block'}</span>
                            {u.status === 'BLOCKED' ? 'DESBLOQUEAR' : 'BLOQUEAR'}
                        </button>
                        
                        <button 
                            onClick={() => handleGenerateRecovery(u)}
                            className="py-3 rounded-xl bg-white text-black text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-icons text-xs">key</span>
                            GERAR CÓDIGO
                        </button>
                        
                        <button 
                            onClick={() => handleToggleVerify(u.id, !u.is_verified)}
                            className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${
                                u.is_verified ? 'bg-blue-500 text-white border-blue-600' : 'bg-white/5 text-white/40 border-white/10'
                            }`}
                        >
                            <span className="material-icons text-xs">verified</span>
                            {u.is_verified ? 'VERIFICADO' : 'VERIFICAR'}
                        </button>

                        <button 
                            onClick={() => handleToggleVaquejadaPerm(u.id, !u.can_add_vaquejada)}
                            className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${
                                u.can_add_vaquejada ? 'bg-[#ECA413] text-black border-[#ECA413]' : 'bg-white/5 text-white/40 border-white/10'
                            }`}
                        >
                            <span className="material-icons text-xs">add_circle</span>
                            {u.can_add_vaquejada ? 'PERM. OK' : 'PERM. VAQUEJADA'}
                        </button>
                    </div>
                )}
            </div>
        ))}
      </div>

      {/* Recovery Code Modal */}
      {isRecoveryModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
              <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setIsRecoveryModalOpen(false)}></div>
              <div className="relative bg-[#1A1108] border border-[#ECA413]/20 rounded-[40px] p-10 max-w-sm w-full text-center shadow-[0_0_100px_rgba(236,164,19,0.1)]">
                  <div className="w-20 h-20 rounded-full bg-[#ECA413]/10 border border-[#ECA413]/20 flex items-center justify-center mb-6 mx-auto">
                      <span className="material-icons text-[#ECA413] text-4xl">vpn_key</span>
                  </div>
                  <h3 className="text-xl font-black italic text-white uppercase tracking-tighter mb-2">Código Gerado!</h3>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-8">Válido por 15 minutos. Use apenas uma vez.</p>
                  
                  <div className="bg-[#ECA413] text-black text-3xl font-black py-6 rounded-3xl tracking-[0.3em] mb-8 font-mono shadow-xl">
                      {recoveryCode}
                  </div>

                  <button 
                    onClick={() => {
                        navigator.clipboard.writeText(recoveryCode || '');
                        alert('Código copiado!');
                    }}
                    className="w-full bg-white/5 border border-white/10 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all mb-4"
                  >
                      COPIAR CÓDIGO
                  </button>

                  <button 
                    onClick={() => setIsRecoveryModalOpen(false)}
                    className="w-full text-white/20 text-[10px] font-black uppercase tracking-widest"
                  >
                      FECHAR
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminUsersView;
