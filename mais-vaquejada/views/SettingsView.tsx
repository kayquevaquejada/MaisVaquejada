
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface SettingsViewProps {
    user: User | null;
    onBack: () => void;
    onLogout: () => void;
    onProfileUpdate?: () => void;
}

type SettingsTab = 'MAIN' | 'EDIT_PROFILE' | 'PRIVACY' | 'SECURITY' | 'NOTIFICATIONS' | 'HELP' | 'ABOUT' | 'ACTIVITY' | 'BLOCKED' | 'LANGUAGE' | 'METRICS';

const SettingsView: React.FC<SettingsViewProps> = ({ user, onBack, onLogout, onProfileUpdate }) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<SettingsTab>('MAIN');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);

    // Profile Form
    const [profileData, setProfileData] = useState({
        name: user?.name || '',
        username: user?.email?.split('@')[0] || '',
        bio: user?.bio || '',
        phone: user?.phone || '',
        email: user?.email || '',
        avatar_url: user?.avatar_url || '',
        isPrivate: false
    });

    // Toggles State
    const [metricsData, setMetricsData] = useState<any>({
        users: 0,
        events: 0,
        news: 0,
        market: 0,
        posts: 0,
        banners: 0
    });

    const [toggles, setToggles] = useState({
        notificationsLikes: true,
        notificationsComments: true,
        notificationsNewFollowers: true,
        notificationsMessages: true,
        notificationsEvents: true,
        privateAccount: false,
        showOnlineStatus: true,
        darkMode: true
    });

    // Sincronizar estado inicial com permissões do sistema
    useEffect(() => {
        if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
            setToggles(prev => ({
                ...prev,
                notificationsLikes: false,
                notificationsComments: false,
                notificationsNewFollowers: false,
                notificationsMessages: false,
                notificationsEvents: false
            }));
        }
    }, []);

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: profileData.name,
                    whatsapp: profileData.phone,
                    bio: profileData.bio,
                    avatar_url: profileData.avatar_url,
                })
                .eq('id', user?.id);

            if (error) throw error;
            setSuccess('Perfil atualizado!');
            if (onProfileUpdate) onProfileUpdate();
            setTimeout(() => {
                setSuccess(null);
                setActiveTab('MAIN');
            }, 2000);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.id) return;

        setLoading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}/${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setProfileData(prev => ({ ...prev, avatar_url: publicUrl }));
            
            // Auto-save the avatar URL to profile immediately or wait for "Salvar"?
            // Usually immediate is better for UX, then user hits save for other fields.
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);
            
            if (updateError) throw updateError;

            if (onProfileUpdate) onProfileUpdate();
            setSuccess('Foto alterada!');
            setTimeout(() => setSuccess(null), 2000);
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            alert(`Erro ao enviar foto: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const [browserNotificationPermission, setBrowserNotificationPermission] = useState<NotificationPermission>(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );

    const toggleSetting = async (key: keyof typeof toggles) => {
        // Se for um toggle de notificação, precisamos verificar permissões do sistema
        if (key.startsWith('notifications')) {
            if (typeof Notification === 'undefined') {
                alert('Notificações não são suportadas neste navegador.');
                return;
            }

            if (Notification.permission === 'denied') {
                alert('As notificações estão bloqueadas no seu aparelho. Por favor, ative-as nas configurações do sistema/navegador para continuar.');
                return;
            }

            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                setBrowserNotificationPermission(permission);
                if (permission !== 'granted') return;
            }
        }

        setToggles(prev => ({ ...prev, [key]: !prev[key] }));
        setSuccess('Preferência atualizada');
        setTimeout(() => setSuccess(null), 2000);
    };

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const [
                { count: users },
                { count: events },
                { count: news },
                { count: market },
                { count: posts },
                { count: banners }
            ] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('events').select('*', { count: 'exact', head: true }),
                supabase.from('news').select('*', { count: 'exact', head: true }),
                supabase.from('market_items').select('*', { count: 'exact', head: true }),
                supabase.from('posts').select('*', { count: 'exact', head: true }),
                supabase.from('banners').select('*', { count: 'exact', head: true })
            ]);

            setMetricsData({
                users: users || 0,
                events: events || 0,
                news: news || 0,
                market: market || 0,
                posts: posts || 0,
                banners: banners || 0
            });
            setActiveTab('METRICS');
        } catch (err: any) {
            alert('Erro ao carregar métricas: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const SettingItem = ({ icon, label, onClick, color = "text-leather", value, isToggle, toggleKey }: any) => (
        <div className="w-full flex items-center justify-between p-4 bg-white/50 border-b border-[#1A1108]/5 active:bg-[#1A1108]/5 transition-colors">
            <button onClick={onClick} className="flex-1 flex items-center gap-4 text-left">
                <span className={`material-icons ${color}`}>{icon}</span>
                <span className="text-sm font-bold text-leather">{label}</span>
            </button>
            <div className="flex items-center gap-2">
                {value && <span className="text-xs font-medium text-leather/40">{value}</span>}
                {isToggle ? (
                    <button
                        onClick={() => toggleSetting(toggleKey)}
                        className={`w-10 h-6 rounded-full transition-colors relative ${toggles[toggleKey as keyof typeof toggles] ? 'bg-[#D4AF37]' : 'bg-leather/10'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${toggles[toggleKey as keyof typeof toggles] ? 'left-5' : 'left-1'}`} />
                    </button>
                ) : (
                    <span className="material-icons text-leather/20">chevron_right</span>
                )}
            </div>
        </div>
    );

    const SubHeader = ({ title, onBackTab = 'MAIN' }: { title: string, onBackTab?: SettingsTab }) => (
        <header className="px-6 py-6 border-b border-[#1A1108]/5 flex items-center gap-4 bg-white sticky top-0 z-10 w-full">
            <button onClick={() => setActiveTab(onBackTab)} className="material-icons text-leather">arrow_back</button>
            <h2 className="text-xl font-black uppercase italic tracking-tight">{title}</h2>
        </header>
    );

    // Sub-Views
    const renderEditProfile = () => (
        <div className="absolute inset-0 bg-[#F8F5F2] flex flex-col z-[120]">
            <header className="px-6 py-6 border-b border-[#1A1108]/5 flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                    <button onClick={() => setActiveTab('MAIN')} className="material-icons text-leather">close</button>
                    <h2 className="text-xl font-black uppercase italic tracking-tight">Editar Perfil</h2>
                </div>
                <button onClick={handleSaveProfile} className="text-[#D4AF37] font-black text-xs uppercase tracking-widest">Salvar</button>
            </header>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex flex-col items-center gap-3">
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-20 h-20 rounded-full bg-leather/10 border-2 border-[#D4AF37] overflow-hidden cursor-pointer active:scale-95 transition-transform"
                    >
                        <img src={profileData.avatar_url || `https://ui-avatars.com/api/?name=${profileData.name}&background=random`} className="w-full h-full object-cover" alt="Profile" />
                    </div>
                    <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest">Alterar foto</button>
                    <input 
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarUpload}
                        accept="image/*"
                        className="hidden"
                    />
                </div>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-leather/40 uppercase tracking-widest pl-1">Nome</label>
                        <input className="w-full bg-white border border-[#1A1108]/5 rounded-xl py-3 px-4 font-bold text-sm text-leather" value={profileData.name} onChange={e => setProfileData({ ...profileData, name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-leather/40 uppercase tracking-widest pl-1">Bio</label>
                        <textarea className="w-full bg-white border border-[#1A1108]/5 rounded-xl py-3 px-4 font-medium text-sm text-leather resize-none" value={profileData.bio} onChange={e => setProfileData({ ...profileData, bio: e.target.value })} rows={3} />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderNotifications = () => (
        <div className="absolute inset-0 bg-[#F8F5F2] flex flex-col z-[120]">
            <SubHeader title="Notificações" />
            <div className="flex-1 overflow-y-auto">
                <div className="px-6 py-4"><h3 className="text-[10px] font-black text-leather/40 uppercase tracking-[0.2em]">Atividades</h3></div>
                <SettingItem icon="favorite_border" label="Curtidas" isToggle toggleKey="notificationsLikes" />
                <SettingItem icon="chat_bubble_outline" label="Comentários" isToggle toggleKey="notificationsComments" />
                <SettingItem icon="person_add_alt" label="Novos Seguidores" isToggle toggleKey="notificationsNewFollowers" />
                <SettingItem icon="mail_outline" label="Mensagens Diretas" isToggle toggleKey="notificationsMessages" />
                <div className="px-6 py-4"><h3 className="text-[10px] font-black text-leather/40 uppercase tracking-[0.2em]">Eventos</h3></div>
                <SettingItem icon="emoji_events" label="Novas Vaquejadas na Região" isToggle toggleKey="notificationsEvents" />
            </div>
        </div>
    );

    const renderPrivacy = () => (
        <div className="absolute inset-0 bg-[#F8F5F2] flex flex-col z-[120]">
            <SubHeader title="Privacidade" />
            <div className="flex-1 overflow-y-auto">
                <div className="px-6 py-4"><h3 className="text-[10px] font-black text-leather/40 uppercase tracking-[0.2em]">Visibilidade</h3></div>
                <SettingItem icon="lock_outline" label="Conta Privada" isToggle toggleKey="privateAccount" />
                <SettingItem icon="visibility" label="Status Online" isToggle toggleKey="showOnlineStatus" />
                <div className="px-6 py-4"><h3 className="text-[10px] font-black text-leather/40 uppercase tracking-[0.2em]">Interações</h3></div>
                <SettingItem icon="block" label="Usuários Bloqueados" onClick={() => setActiveTab('BLOCKED')} />
                <SettingItem icon="stars" label="Amigos Próximos" onClick={() => { }} />
            </div>
        </div>
    );

    const renderSecurity = () => (
        <div className="absolute inset-0 bg-[#F8F5F2] flex flex-col z-[120]">
            <SubHeader title="Segurança" />
            <div className="flex-1 overflow-y-auto">
                <div className="px-6 py-4"><h3 className="text-[10px] font-black text-leather/40 uppercase tracking-[0.2em]">Login</h3></div>
                <SettingItem icon="password" label="Alterar Senha" onClick={() => alert('Link de alteração enviado para seu e-mail!')} />
                <SettingItem icon="phonelink_lock" label="Autenticação em duas etapas" onClick={() => alert('Módulo em desenvolvimento')} />
                <SettingItem icon="devices" label="Dispositivos Conectados" onClick={() => alert('Você está conectado apenas neste dispositivo.')} />
            </div>
        </div>
    );

    const renderAbout = () => (
        <div className="absolute inset-0 bg-[#F8F5F2] flex flex-col z-[120]">
            <SubHeader title="Sobre" />
            <div className="flex-1 overflow-y-auto">
                <SettingItem icon="description" label="Termos de Uso" onClick={() => window.open('https://example.com/terms', '_blank')} />
                <SettingItem icon="privacy_tip" label="Política de Privacidade" onClick={() => window.open('https://example.com/privacy', '_blank')} />
                <SettingItem icon="code" label="Versão do App" value="v2.4.0 (Gold Era)" />
                <div className="p-8 text-center space-y-4 opacity-40">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">Arena +Vaquejada</p>
                    <p className="text-[9px] font-medium leading-relaxed">Desenvolvido com paixão pela cultura nordestina. Todos os direitos reservados © 2024.</p>
                </div>
            </div>
        </div>
    );

    const renderHelp = () => (
        <div className="absolute inset-0 bg-[#F8F5F2] flex flex-col z-[120]">
            <SubHeader title="Ajuda" />
            <div className="flex-1 overflow-y-auto">
                <SettingItem icon="report_problem" label="Relatar um problema" onClick={() => alert('Descreva o erro para suporte@arena.com')} />
                <SettingItem icon="help_center" label="Central de Ajuda" onClick={() => alert('Buscando base de conhecimento...')} />
                <SettingItem icon="support_agent" label="Falar com Suporte" onClick={() => window.open('https://wa.me/5581999999999', '_blank')} />
            </div>
        </div>
    );

    const renderMetrics = () => {
        const stats = [
            { label: 'Usuários Totais', value: metricsData.users, icon: 'groups', color: 'bg-blue-50 text-blue-600', trend: '+12%' },
            { label: 'Vaquejadas', value: metricsData.events, icon: 'emoji_events', color: 'bg-[#D4AF37]/10 text-[#D4AF37]', trend: 'Ativas' },
            { label: 'Notícias App', value: metricsData.news, icon: 'newspaper', color: 'bg-red-50 text-red-600', trend: 'Live' },
            { label: 'Marketplace', value: metricsData.market, icon: 'storefront', color: 'bg-green-50 text-green-600', trend: 'Items' },
            { label: 'Postagens Core', value: metricsData.posts, icon: 'forum', color: 'bg-purple-50 text-purple-600', trend: 'Social' },
            { label: 'Anunciantes', value: metricsData.banners, icon: 'campaign', color: 'bg-orange-50 text-orange-600', trend: 'Banners' },
        ];

        return (
            <div className="absolute inset-0 bg-[#F8F5F2] flex flex-col z-[120]">
                <SubHeader title="Métricas Globais" />
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="bg-[#1A1108] p-8 rounded-[32px] text-white space-y-2 relative overflow-hidden shadow-2xl">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Resumo Geral</p>
                            <h3 className="text-3xl font-black italic tracking-tighter tabular-nums">{Object.values(metricsData).reduce((a: any, b: any) => a + b, 0)}</h3>
                            <p className="text-xs font-bold text-[#D4AF37]">Total de interações acumuladas</p>
                        </div>
                        <div className="absolute top-[-20%] right-[-10%] opacity-10">
                            <span className="material-icons text-[120px]">analytics</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {stats.map((stat, i) => (
                            <div key={i} className="bg-white p-5 rounded-3xl border border-[#1A1108]/5 shadow-sm space-y-3 active:scale-95 transition-transform">
                                <div className={`w-10 h-10 rounded-2xl ${stat.color} flex items-center justify-center shadow-inner`}>
                                    <span className="material-icons text-xl">{stat.icon}</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-leather/30">{stat.label}</p>
                                    <div className="flex items-baseline gap-2">
                                        <h4 className="text-2xl font-black italic tracking-tighter text-leather tabular-nums">{stat.value}</h4>
                                        <span className="text-[8px] font-bold uppercase text-leather/40">{stat.trend}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Meta/Goal Progress */}
                    <div className="bg-white p-6 rounded-3xl border border-[#1A1108]/5 space-y-4">
                         <div className="flex justify-between items-center">
                             <h4 className="text-[10px] font-black uppercase tracking-widest text-leather">Meta de Usuários</h4>
                             <span className="text-[10px] font-black text-[#D4AF37]">{(metricsData.users / 5000 * 100).toFixed(1)}%</span>
                         </div>
                         <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                             <div className="h-full bg-[#D4AF37] transition-all duration-1000" style={{ width: `${Math.min(metricsData.users / 5000 * 100, 100)}%` }} />
                         </div>
                         <p className="text-[9px] font-bold text-leather/40 text-center uppercase tracking-tighter">Próximo Marco: 5.000 Usuários</p>
                    </div>

                    <p className="text-[9px] text-center text-leather/20 font-medium pb-10">Dados atualizados em tempo real via Supabase Database.</p>
                </div>
            </div>
        );
    };

    // Main Root View
    if (activeTab === 'EDIT_PROFILE') return renderEditProfile();
    if (activeTab === 'NOTIFICATIONS') return renderNotifications();
    if (activeTab === 'PRIVACY') return renderPrivacy();
    if (activeTab === 'SECURITY') return renderSecurity();
    if (activeTab === 'HELP') return renderHelp();
    if (activeTab === 'ABOUT') return renderAbout();
    if (activeTab === 'METRICS') return renderMetrics();

    return (
        <div className="absolute inset-0 bg-[#F8F5F2] flex flex-col z-[120] animate-in slide-in-from-right duration-300">
            <header className="px-6 py-6 border-b border-[#1A1108]/5 flex items-center gap-4 bg-white sticky top-0 z-10 w-full">
                <button onClick={onBack} className="material-icons text-leather">arrow_back</button>
                <h2 className="text-xl font-black uppercase italic tracking-tight">Configurações</h2>
            </header>

            <div className="flex-1 overflow-y-auto pb-12">
                {/* Account Center */}
                <div className="m-4 p-5 bg-white rounded-2xl shadow-sm border border-[#1A1108]/5 space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="material-icons text-[#0066FF]">manage_accounts</span>
                        <h4 className="text-xs font-black uppercase tracking-widest">Central de Contas</h4>
                    </div>
                    <p className="text-[10px] text-leather/60 leading-relaxed">Gerencie suas experiências conectadas e configurações de conta em todas as plataformas da Arena.</p>
                    <button onClick={() => setActiveTab('SECURITY')} className="text-[10px] font-black text-[#0066FF] uppercase tracking-widest pt-2">Ver mais na Central de Contas</button>
                </div>

                <div className="px-6 py-4"><h3 className="text-[10px] font-black text-leather/40 uppercase tracking-[0.2em]">Como você usa o +Vaquejada</h3></div>
                <SettingItem icon="person_outline" label="Editar Perfil" value={user?.name} onClick={() => setActiveTab('EDIT_PROFILE')} />
                <SettingItem icon="notifications_none" label="Notificações" onClick={() => setActiveTab('NOTIFICATIONS')} />
                <SettingItem icon="history" label="Sua Atividade" onClick={() => alert('Buscando histórico de interações...')} />

                <div className="px-6 py-4"><h3 className="text-[10px] font-black text-leather/40 uppercase tracking-[0.2em]">Quem pode ver seu conteúdo</h3></div>
                <SettingItem icon="lock_outline" label="Privacidade" value={toggles.privateAccount ? "Privada" : "Pública"} onClick={() => setActiveTab('PRIVACY')} />
                <SettingItem icon="stars" label="Amigos Próximos" onClick={() => { }} />
                <SettingItem icon="block" label="Bloqueados" onClick={() => setActiveTab('PRIVACY')} />

                <div className="px-6 py-4"><h3 className="text-[10px] font-black text-leather/40 uppercase tracking-[0.2em]">Seu app e mídia</h3></div>
                <SettingItem icon="language" label="Idioma" value="Português (BR)" onClick={() => alert('Somente Português disponível nesta versão')} />
                <SettingItem icon="dark_mode" label="Modo Escuro" isToggle toggleKey="darkMode" />
                <SettingItem icon="monitor_weight" label="Uso de dados" onClick={() => alert('Consumo de dados otimizado')} />

                <div className="px-6 py-4"><h3 className="text-[10px] font-black text-leather/40 uppercase tracking-[0.2em]">Mais informações</h3></div>
                <SettingItem icon="help_outline" label="Ajuda" onClick={() => setActiveTab('HELP')} />
                <SettingItem icon="info_outline" label="Sobre" onClick={() => setActiveTab('ABOUT')} />

                {(user?.isMaster || user?.admin_mercado || user?.admin_social || user?.admin_eventos || user?.admin_noticias || user?.role === 'ADMIN') && (
                    <>
                        <div className="px-6 py-4"><h3 className="text-[10px] font-black text-leather/40 uppercase tracking-[0.2em]">Administração</h3></div>
                        <SettingItem icon="admin_panel_settings" label="Painel de Controle (ADM)" color="text-[#D4AF37]" onClick={() => window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view: 'ADMIN' } }))} />
                        {user?.isMaster && <SettingItem icon="analytics" label="Métricas Globais" color="text-[#D4AF37]" onClick={fetchMetrics} />}
                    </>
                )}

                <div className="mt-8 px-6 space-y-4 text-center">
                    <button onClick={onLogout} className="w-full bg-red-50 text-red-500 font-black py-4 rounded-xl uppercase tracking-widest text-xs border border-red-100 active:scale-95 transition-transform">Sair da Conta</button>
                    <button onClick={() => { if (confirm('Deseja realmente excluir sua conta?')) alert('Sua solicitação será processada em 30 dias.'); }} className="text-red-600/30 font-black uppercase text-[10px] tracking-widest">Excluir Conta</button>
                </div>

                <div className="py-12 flex flex-col items-center opacity-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">+VAQUEJADA</p>
                    <p className="text-[8px] font-bold">2.4.0-GOLD</p>
                </div>
            </div>

            {success && (
                <div className="fixed bottom-24 left-6 right-6 bg-green-500 text-white px-6 py-4 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom duration-300 z-[200] flex items-center gap-3">
                    <span className="material-icons">check_circle</span>
                    <p className="text-sm font-bold">{success}</p>
                </div>
            )}

            {loading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-[300]">
                    <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
};

export default SettingsView;
