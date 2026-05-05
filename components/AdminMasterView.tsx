import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Complaint } from '../types';
import { 
  Users, 
  TrendingUp, 
  Layout, 
  BarChart3, 
  ShieldCheck, 
  Activity, 
  Eye, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Lock,
  Unlock,
  UserPlus,
  UserMinus,
  AlertCircle,
  FileText,
  MousePointer2,
  Clock,
  Database,
  ArrowRight,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  Trash2
} from 'lucide-react';

interface AdminMasterViewProps {
  user: any;
  onBack: () => void;
}

type MasterSection = 'OPERATIONAL' | 'INTELLIGENCE' | 'USERS' | 'ADVERTISING' | 'AUDIT' | 'SYSTEM';

const AdminMasterView: React.FC<AdminMasterViewProps> = ({ user, onBack }) => {
  const [activeSection, setActiveSection] = useState<MasterSection>('OPERATIONAL');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    totalUsers: 0,
    activeToday: 0,
    new24h: 0,
    totalPosts: 0,
    activeAds: 0,
    adClicks: 0,
    pendingReports: 0
  });

  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [adCampaigns, setAdCampaigns] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [healthData, setHealthData] = useState<any>({});

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const fetchGlobalData = async () => {
    setLoading(true);
    try {
      // Parallel fetch for speed
      const [
        { count: totalUsers },
        { count: totalPosts },
        { data: campaigns },
        { data: users },
        { count: pendingReports }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('ads_campaigns').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      ]);

      // Mocking some dynamic data that might not have tables yet but requested by prompt
      const mockStats = {
        totalUsers: totalUsers || 0,
        activeToday: Math.floor((totalUsers || 0) * 0.15), // 15% active mock
        new24h: Math.floor((totalUsers || 0) * 0.02),
        totalPosts: totalPosts || 0,
        activeAds: campaigns?.filter(c => c.status === 'active').length || 0,
        adClicks: campaigns?.reduce((acc, c) => acc + (c.clicks || 0), 0) || 0,
        pendingReports: pendingReports || 0
      };

      setStats(mockStats);
      setUsersList(users || []);
      setAdCampaigns(campaigns || []);
      
      // Fetch mock logs for now
      setAuditLogs([
        { id: 1, user: 'admin_master', action: 'Bloqueio de Usuário', target: '@vaqueiro123', date: new Date().toISOString(), module: 'USUÁRIOS' },
        { id: 2, user: 'social_admin', action: 'Nova Campanha', target: 'Haras PFF', date: new Date().toISOString(), module: 'PUBLICIDADE' },
        { id: 3, user: 'admin_master', action: 'Alteração de Fundo', target: 'Login Screen', date: new Date().toISOString(), module: 'SISTEMA' }
      ]);

      // Fetch System Health from app_settings
      const { data: storageSettings } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'storage_monitoring')
        .single();

      const storageData = storageSettings?.value || { used_gb: 4.2, limit_gb: 100 };

      setHealthData({
        uploadsToday: 142,
        storageUsed: storageData.used_gb,
        storageLimit: storageData.limit_gb,
        loginFailures: 12,
        notifsSent: 1205,
        syncStatus: 'OK'
      });

    } catch (error) {
      console.error('Erro ao buscar dados administrativos');
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (action: 'block' | 'activate' | 'promote' | 'delete', userId: string) => {
    if (action === 'delete') {
      const confirmed = window.confirm('TEM CERTEZA? Esta ação excluirá permanentemente o usuário e todos os seus dados da Arena. Esta ação não pode ser desfeita.');
      if (!confirmed) return;

      setLoading(true);
      try {
        const { error } = await supabase.rpc('delete_user_admin', { target_user_id: userId });
        if (error) throw error;
        
        alert('Usuário excluído com sucesso.');
        fetchGlobalData(); // Refresh list
        setSelectedUser(null);
      } catch (err: any) {
        console.error('Erro ao deletar registro');
        alert('Erro ao excluir usuário: ' + err.message);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // Implementation for security and auditing
    alert(`Ação "${action}" realizada com sucesso (Simulado).`);
  };

  // --- SUB-RENDERERS ---

  const renderIndicatorCards = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6">
        {[
          { label: 'Usuários Totais', value: stats.totalUsers, icon: <Users size={20} />, trend: '+5%', color: 'border-white/20' },
          { label: 'Ativos Hoje', value: stats.activeToday, icon: <Activity size={20} />, trend: '+12%', color: 'border-[#4CAF50]' },
          { label: 'Novos (24h)', value: stats.new24h, icon: <UserPlus size={20} />, trend: '+2%', color: 'border-[#D4AF37]' },
          { label: 'Posts Arena', value: stats.totalPosts, icon: <Layout size={20} />, trend: '+8%', color: 'border-white/20' },
        ].map((card, i) => (
          <div key={i} className={`bg-[#1A1108] p-4 rounded-3xl border-l-4 ${card.color} shadow-sm active:scale-95 transition-transform border-white/5`}>
            <div className="flex justify-between items-start mb-2">
              <div className="text-white/20">{card.icon}</div>
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${card.trend.includes('+') ? 'bg-green-50 text-green-600' : 'bg-neutral-50 text-neutral-400'}`}>
                {card.trend}
              </span>
            </div>
            <p className="text-2xl font-black text-white tracking-tighter leading-none mb-1">{card.value}</p>
            <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="px-6">
        <div className="bg-[#1A1108] rounded-[32px] border border-white/5 p-6 shadow-sm overflow-hidden relative">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] mb-1">Tráfego Global</h4>
              <p className="text-sm font-black text-white italic uppercase">Acessos por hora (Hoje)</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-white leading-none">1.2k</p>
              <p className="text-[8px] font-black text-green-500 uppercase">Sessões Ativas</p>
            </div>
          </div>
          
          <div className="h-32 w-full mt-4 flex items-end gap-1">
             {[30, 45, 25, 60, 80, 40, 90, 100, 70, 50, 40, 60, 30, 45, 25, 60, 35, 55, 65, 85, 95, 75, 45, 30].map((h, i) => (
               <div key={i} className="flex-1 group relative">
                  <div 
                    className="w-full bg-[#D4AF37]/10 group-hover:bg-[#D4AF37]/40 rounded-t-sm transition-all cursor-crosshair" 
                    style={{ height: `${h}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#1A1108] text-white text-[7px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-black border border-white/10">
                      {h}v
                    </div>
                  </div>
               </div>
             ))}
          </div>
          <div className="flex justify-between mt-2 px-1">
            <span className="text-[7px] font-black text-white/20 uppercase">00h</span>
            <span className="text-[7px] font-black text-white/20 uppercase">12h</span>
            <span className="text-[7px] font-black text-white/20 uppercase">23h</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsersSection = () => (
    <div className="px-6 space-y-6">
      <div className="bg-[#1A1108] rounded-[32px] border border-white/5 shadow-sm overflow-hidden mb-6">
        <header className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white uppercase italic">Central de Usuários</h3>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Gestão Global de Contas</p>
          </div>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar vaqueiro..."
              className="bg-[#0F0A05] border border-white/10 rounded-full py-2 px-4 pl-10 text-[10px] font-bold text-white outline-none focus:border-[#D4AF37] transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={12} />
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#0F0A05]">
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/40">Usuário</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/40">Contato</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/40">Nível</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/40">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {usersList.map(u => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setSelectedUser(u)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}&background=random`} className="w-8 h-8 rounded-full border border-white/10" />
                      <div>
                        <p className="text-[11px] font-black text-white">@{u.username}</p>
                        <p className="text-[9px] font-bold text-white/40">{u.full_name || u.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold flex items-center gap-1 text-white/60"><Mail size={8} /> {u.email}</p>
                      <p className="text-[9px] font-bold flex items-center gap-1 text-white/60"><Phone size={8} /> {u.phone || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${
                      u.role === 'ADMIN_MASTER' ? 'bg-[#D4AF37] text-black' : 
                      u.role === 'ADMIN' ? 'bg-white text-black' : 'bg-white/5 text-white/40'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedUser(u); }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white/20 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                      {u.role !== 'ADMIN_MASTER' && u.id !== user.id && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleUserAction('delete', u.id); }}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-red-500/20 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAdvertisingSection = () => (
    <div className="px-6 space-y-6">
      <div className="bg-[#1A1108] rounded-[32px] border border-white/5 shadow-sm overflow-hidden mb-6">
        <header className="p-6 border-b border-white/5">
          <h3 className="text-sm font-black text-white uppercase italic">Inteligência de Publicidade</h3>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Performance e Monetização</p>
        </header>

        <div className="p-6 space-y-4">
          {adCampaigns.map(ad => (
            <div key={ad.id} className="flex items-center gap-4 p-4 rounded-2xl bg-[#0F0A05] border border-white/5 hover:border-[#D4AF37]/30 transition-all cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-black/10 overflow-hidden relative">
                <img src={ad.image_url} className="w-full h-full object-cover" />
                {ad.status === 'active' && <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full border border-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[11px] font-black text-white truncate uppercase">{ad.internal_name}</h4>
                <div className="flex gap-4 mt-2">
                  <div className="text-center">
                    <p className="text-[12px] font-black text-white opacity-80">{ad.impressions || 0}</p>
                    <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Impuls.</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[12px] font-black text-[#D4AF37]">{ad.clicks || 0}</p>
                    <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Cliques</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[12px] font-black text-blue-500">
                      {ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : 0}%
                    </p>
                    <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">CTR</p>
                  </div>
                </div>
              </div>
              <ChevronRight size={16} className="text-white/20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAuditSection = () => (
    <div className="px-6 space-y-6">
      <div className="bg-[#1A1108] rounded-[32px] border border-white/5 shadow-sm overflow-hidden mb-6">
        <header className="p-6 border-b border-white/5 flex items-center gap-3">
          <ShieldCheck className="text-[#D4AF37]" size={20} />
          <div>
            <h3 className="text-sm font-black text-white uppercase italic">Auditoria e Segurança</h3>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Rastreabilidade Administrativa</p>
          </div>
        </header>

        <div className="p-6 space-y-3">
          {auditLogs.map(log => (
            <div key={log.id} className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-[#0F0A05]/50">
              <div className="mt-1">
                <Clock size={14} className="text-white/30" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] font-black text-white uppercase tracking-tighter italic">@{log.user}</p>
                  <span className="text-[8px] font-black text-white/20">
                    {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs font-medium text-white/80 leading-relaxed">
                   Realizou <span className="font-black text-[#D4AF37]">{log.action}</span> em <span className="font-black">{log.target}</span>
                </p>
                <div className="mt-2 text-[8px] font-black uppercase text-white/30 tracking-widest bg-[#0F0A05] inline-block px-1.5 py-0.5 rounded border border-white/5">
                  Módulo: {log.module}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSystemHealth = () => (
    <div className="px-6 grid grid-cols-1 md:grid-cols-2 gap-6 pb-24">
      <div className="bg-[#1A1108] rounded-[32px] border border-white/5 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
           <Database className="text-blue-500" size={20} />
           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Infraestrutura</h4>
        </div>
        <div className="space-y-6">
          <div className="p-4 rounded-3xl bg-[#0F0A05] border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <div>
                <p className="text-[8px] font-black uppercase text-white/40 tracking-widest">Armazenamento</p>
                <p className="text-xs font-bold text-white">Bucket Supabase</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-white">{healthData.storageUsed} GB <span className="text-white/20 font-medium">/ {healthData.storageLimit} GB</span></p>
                <p className="text-[8px] font-black text-[#D4AF37] uppercase">{((healthData.storageUsed / healthData.storageLimit) * 100).toFixed(1)}% usado</p>
              </div>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${
                  (healthData.storageUsed / healthData.storageLimit) > 0.9 ? 'bg-red-500' : 
                  (healthData.storageUsed / healthData.storageLimit) > 0.7 ? 'bg-orange-500' : 'bg-[#D4AF37]'
                }`}
                style={{ width: `${Math.min((healthData.storageUsed / healthData.storageLimit) * 100, 100)}%` }}
              />
            </div>
          </div>

          {[
            { label: 'Uploads (Hoje)', value: healthData.uploadsToday, subtitle: 'Imagens e Vídeos' },
            { label: 'Notificações', value: healthData.notifsSent, subtitle: 'Push / In-app' },
            { label: 'Status API', value: healthData.syncStatus, subtitle: 'Global Sinc' }
          ].map((item, i) => (
            <div key={i} className="flex justify-between items-center p-3 px-4 rounded-2xl bg-[#0F0A05] border border-white/5">
              <div>
                <p className="text-[8px] font-black uppercase text-white/40 tracking-widest">{item.label}</p>
                <p className="text-xs font-bold text-white">{item.subtitle}</p>
              </div>
              <p className="text-sm font-black text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#1A1108] rounded-[32px] border border-white/5 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
           <TrendingUp className="text-[#D4AF37]" size={20} />
           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Auditoria Operacional</h4>
        </div>
        <div className="p-8 text-center bg-[#0F0A05] rounded-2xl border border-dashed border-white/10">
          <BarChart3 className="mx-auto text-white/10 mb-2" size={32} />
          <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">Gráficos de Performance</p>
          <p className="text-[8px] font-bold text-white/20 mt-1">Sincronizando com Analytics...</p>
        </div>
      </div>
    </div>
  );

  // --- MAIN RENDER ---

  const renderSectionTabs = () => (
    <div className="flex px-6 gap-2 mb-8 overflow-x-auto hide-scrollbar">
      {[
        { id: 'OPERATIONAL', label: 'Operacional', icon: <Activity size={12} /> },
        { id: 'USERS', label: 'Usuários', icon: <Users size={12} /> },
        { id: 'ADVERTISING', label: 'Publicidade', icon: <TrendingUp size={12} /> },
        { id: 'AUDIT', label: 'Auditoria', icon: <ShieldCheck size={12} /> },
        { id: 'SYSTEM', label: 'Sistema', icon: <Database size={12} /> }
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveSection(tab.id as MasterSection)}
          className={`flex items-center gap-2 py-3 px-5 rounded-full whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all border ${
            activeSection === tab.id 
              ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20' 
              : 'bg-[#1A1108] text-white/40 border-white/5 hover:border-white/10'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );

  if (!user || user.role !== 'ADMIN_MASTER') {
    return (
       <div className="flex flex-col items-center justify-center p-12 text-center h-full gap-4">
          <Lock size={48} className="text-red-500 opacity-20" />
          <h2 className="text-white font-black uppercase italic text-xl">Acesso Negado</h2>
          <p className="text-white/40 text-xs uppercase tracking-widest">Apenas Administradores Master possuem autorização.</p>
          <button onClick={onBack} className="mt-4 px-8 py-3 bg-[#D4AF37] text-black rounded-full font-black text-[10px] uppercase tracking-widest">Voltar</button>
       </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-[#0F0A05] flex flex-col z-[500] animate-in slide-in-from-bottom-4 duration-500 overflow-y-auto">
      {/* Premium Header */}
      <header className="px-6 py-10 bg-[#0F0A05] text-white flex flex-col gap-6 relative overflow-hidden border-b border-white/5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
        
        <div className="flex justify-between items-start z-10">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all active:scale-90">
             <ChevronRight className="rotate-180" size={20} />
          </button>
          <div className="text-right">
             <span className="text-[10px] font-black px-3 py-1 bg-[#D4AF37] text-white rounded-full uppercase tracking-widest shadow-lg shadow-[#D4AF37]/30">
               Status: Full Master
             </span>
             <p className="text-[8px] text-white/40 font-bold uppercase tracking-widest mt-2 flex items-center justify-end gap-1">
               <Clock size={8} /> Sincronizado: Agora
             </p>
          </div>
        </div>

        <div className="z-10">
          <h2 className="text-3xl font-black italic tracking-tighter leading-none mb-1">ADM MASTER</h2>
          <p className="text-xs font-black uppercase text-[#D4AF37] tracking-[0.3em]">Controle Global do Ecossistema</p>
        </div>
      </header>

      <main className="py-8 space-y-2">
        {renderSectionTabs()}

        {activeSection === 'OPERATIONAL' && (
          <>
            <div className="px-6 mb-4">
               <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Panorama Geral</h3>
            </div>
            {renderIndicatorCards()}
            
            <div className="px-6 mb-4">
              <div className="bg-[#D4AF37] text-white p-6 rounded-[32px] shadow-lg flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black uppercase italic mb-1">Crescimento da Base</h4>
                  <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Resumo de performance mensal</p>
                </div>
                <div className="text-right">
                   <p className="text-2xl font-black">+142</p>
                   <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Novos Vaqueiros</p>
                </div>
              </div>
            </div>
          </>
        )}

        {activeSection === 'USERS' && renderUsersSection()}
        {activeSection === 'ADVERTISING' && renderAdvertisingSection()}
        {activeSection === 'AUDIT' && renderAuditSection()}
        {activeSection === 'SYSTEM' && renderSystemHealth()}
      </main>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-[#1A1108] w-full max-w-md rounded-[48px] overflow-hidden shadow-2xl relative animate-in zoom-in-95 border border-white/5" onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => setSelectedUser(null)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-white/40 active:scale-95 transition-all"
              >
                <MoreVertical size={20} />
              </button>

              <div className="p-8 pt-12 flex flex-col items-center text-center">
                 <div className="w-24 h-24 rounded-[32px] border-4 border-[#D4AF37]/20 p-1 mb-4 shadow-xl">
                    <img src={selectedUser.avatar_url || `https://ui-avatars.com/api/?name=${selectedUser.username}&background=random`} className="w-full h-full object-cover rounded-[28px]" />
                 </div>
                 <h4 className="text-xl font-black text-white italic uppercase tracking-tighter">@{selectedUser.username}</h4>
                 <p className="text-sm font-bold text-white/40 mb-6">{selectedUser.full_name || selectedUser.name}</p>

                 <div className="grid grid-cols-2 gap-3 w-full mb-8">
                    <div className="bg-[#0F0A05] p-4 rounded-3xl border border-white/5">
                       <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Status da Conta</p>
                       <div className="flex items-center justify-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${selectedUser.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`} />
                          <p className="text-[10px] font-black text-white uppercase">{selectedUser.status}</p>
                       </div>
                    </div>
                    <div className="bg-[#0F0A05] p-4 rounded-3xl border border-white/5">
                       <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Tipo de Membro</p>
                       <p className="text-[10px] font-black uppercase text-[#D4AF37]">{selectedUser.role}</p>
                    </div>
                 </div>

                 <div className="w-full space-y-4 text-left">
                    <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-[#0F0A05] border border-white/5">
                       <Mail size={16} className="text-white/20" />
                       <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">E-mail</p>
                          <p className="text-xs font-bold text-white truncate">{selectedUser.email}</p>
                       </div>
                    </div>
                    
                    <div className="p-6 rounded-3xl bg-[#0F0A05] border border-white/5">
                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-4">Módulos Administrativos</p>
                        <div className="grid grid-cols-2 gap-3">
                           {[
                             { label: 'Mercado', key: 'admin_mercado', icon: 'storefront' },
                             { label: 'Social', key: 'admin_social', icon: 'campaign' },
                             { label: 'Eventos', key: 'admin_eventos', icon: 'emoji_events' },
                             { label: 'Notícias', key: 'admin_noticias', icon: 'newspaper' }
                           ].map(perm => (
                             <button 
                               key={perm.key}
                               onClick={() => handleUserAction('promote', selectedUser.id)}
                               className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                                 selectedUser[perm.key] ? 'border-[#D4AF37] bg-[#D4AF37]/5 text-[#D4AF37]' : 'border-white/5 text-white/20 grayscale opacity-40'
                               }`}
                             >
                                <span className="material-icons text-sm">{perm.icon}</span>
                                <span className="text-[9px] font-black uppercase">{perm.label}</span>
                             </button>
                           ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-[#0F0A05] border border-white/5">
                       <MapPin size={16} className="text-white/20" />
                       <div>
                          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Localização</p>
                          <p className="text-xs font-bold text-white">{selectedUser.city_name || 'Não informada'} - {selectedUser.state_name || 'N/A'}</p>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4 w-full mt-10">
                    <button 
                      onClick={() => handleUserAction('delete', selectedUser.id)}
                      className="py-4 rounded-2xl border-2 border-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                    >
                       <Trash2 size={14} /> Excluir Conta
                    </button>
                    <button 
                      onClick={() => handleUserAction('promote', selectedUser.id)}
                      className="py-4 rounded-2xl bg-[#D4AF37] text-white text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                       <Unlock size={14} /> Promover
                    </button>
                 </div>
              </div>
              
              <footer className="p-4 bg-[#0F0A05] border-t border-white/5 text-center">
                 <button onClick={() => setSelectedUser(null)} className="text-[10px] font-black text-white/30 uppercase tracking-widest hover:text-white transition-colors">Fechar Detalhes</button>
              </footer>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminMasterView;
