
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';

interface SettingsViewProps {
    user: User | null;
    onBack: () => void;
    onLogout: () => void;
    onProfileUpdate?: () => void;
}

type SettingsTab = 'MAIN' | 'EDIT_PROFILE' | 'PRIVACY' | 'SECURITY' | 'NOTIFICATIONS' | 'HELP' | 'ABOUT' | 'ACTIVITY' | 'BLOCKED' | 'LANGUAGE' | 'METRICS' | 'DATA_USAGE';

const SettingsView: React.FC<SettingsViewProps> = ({ user, onBack, onLogout, onProfileUpdate }) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<SettingsTab>('MAIN');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);

    const { t, lang, changeLanguage } = useI18n();

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
        darkMode: document.documentElement.classList.contains('dark')
    });

    const [connectionType, setConnectionType] = useState<string>('Desconhecida');

    useEffect(() => {
        if ('connection' in navigator) {
            const conn = (navigator as any).connection;
            setConnectionType(conn.effectiveType || 'Wifi/Outro');
        }
    }, []);

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
            setSuccess(t('save'));
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
            
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);
            
            if (updateError) throw updateError;

            if (onProfileUpdate) onProfileUpdate();
            setSuccess(t('save'));
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
        if (key.startsWith('notifications')) {
            if (typeof Notification === 'undefined') {
                alert('Notificações não suportadas');
                return;
            }

            if (Notification.permission === 'denied') {
                alert('Ative as notificações no sistema');
                return;
            }

            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                setBrowserNotificationPermission(permission);
                if (permission !== 'granted') return;
            }
        }

        if (key === 'darkMode') {
            document.documentElement.classList.toggle('dark');
        }

        setToggles(prev => ({ ...prev, [key]: !prev[key] }));
        setSuccess(t('save'));
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
        <div className="w-full flex items-center justify-between p-4 bg-white/50 dark:bg-[#1A1108]/30 border-b border-[#1A1108]/5 dark:border-white/5 active:bg-[#1A1108]/5 transition-colors">
            <button onClick={onClick} className="flex-1 flex items-center gap-4 text-left">
                <span className={`material-icons ${color} dark:text-white/70`}>{icon}</span>
                <span className="text-sm font-bold text-leather dark:text-white">{label}</span>
            </button>
            <div className="flex items-center gap-2">
                {value && <span className="text-xs font-medium text-leather/40 dark:text-white/40">{value}</span>}
                {isToggle ? (
                    <button
                        onClick={() => toggleSetting(toggleKey)}
                        className={`w-10 h-6 rounded-full transition-colors relative ${toggles[toggleKey as keyof typeof toggles] ? 'bg-[#D4AF37]' : 'bg-leather/10'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${toggles[toggleKey as keyof typeof toggles] ? 'left-5' : 'left-1'}`} />
                    </button>
                ) : (
                    <span className="material-icons text-leather/20 dark:text-white/10">chevron_right</span>
                )}
            </div>
        </div>
    );

    const SubHeader = ({ title, onBackTab = 'MAIN' }: { title: string, onBackTab?: SettingsTab }) => (
        <header className="px-6 py-6 border-b border-[#1A1108]/5 dark:border-white/5 flex items-center gap-4 bg-white dark:bg-[#12100a] sticky top-0 z-10 w-full">
            <button onClick={() => setActiveTab(onBackTab)} className="material-icons text-leather dark:text-white">arrow_back</button>
            <h2 className="text-xl font-black uppercase italic tracking-tight dark:text-white">{title}</h2>
        </header>
    );

    const renderEditProfile = () => (
        <div className="absolute inset-0 bg-[#F8F5F2] dark:bg-[#12100a] flex flex-col z-[120]">
            <header className="px-6 py-6 border-b border-[#1A1108]/5 dark:border-white/5 flex items-center justify-between bg-white dark:bg-[#12100a]">
                <div className="flex items-center gap-4">
                    <button onClick={() => setActiveTab('MAIN')} className="material-icons text-leather dark:text-white">close</button>
                    <h2 className="text-xl font-black uppercase italic tracking-tight dark:text-white">{t('editProfile')}</h2>
                </div>
                <button onClick={handleSaveProfile} className="text-[#D4AF37] font-black text-xs uppercase tracking-widest">{t('save')}</button>
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
                        <input className="w-full bg-white dark:bg-white/5 border border-[#1A1108]/5 dark:border-white/5 rounded-xl py-3 px-4 font-bold text-sm text-leather dark:text-white" value={profileData.name} onChange={e => setProfileData({ ...profileData, name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-leather/40 uppercase tracking-widest pl-1">Bio</label>
                        <textarea className="w-full bg-white dark:bg-white/5 border border-[#1A1108]/5 dark:border-white/5 rounded-xl py-3 px-4 font-medium text-sm text-leather dark:text-white resize-none" value={profileData.bio} onChange={e => setProfileData({ ...profileData, bio: e.target.value })} rows={3} />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderNotifications = () => (
        <div className="absolute inset-0 bg-[#F8F5F2] dark:bg-[#12100a] flex flex-col z-[120]">
            <SubHeader title={t('notifications')} />
            <div className="flex-1 overflow-y-auto">
                <div className="px-6 py-4"><h3 className="text-[10px] font-black text-leather/40 dark:text-white/30 uppercase tracking-[0.2em]">Atividades</h3></div>
                <SettingItem icon="favorite_border" label="Curtidas" isToggle toggleKey="notificationsLikes" />
                <SettingItem icon="chat_bubble_outline" label="Comentários" isToggle toggleKey="notificationsComments" />
                <SettingItem icon="person_add_alt" label="Novos Seguidores" isToggle toggleKey="notificationsNewFollowers" />
                <SettingItem icon="mail_outline" label="Mensagens Diretas" isToggle toggleKey="notificationsMessages" />
                <div className="px-6 py-4"><h3 className="text-[10px] font-black text-leather/40 dark:text-white/30 uppercase tracking-[0.2em]">Eventos</h3></div>
                <SettingItem icon="emoji_events" label="Novas Vaquejadas na Região" isToggle toggleKey="notificationsEvents" />
            </div>
        </div>
    );

    const renderLanguage = () => (
        <div className="absolute inset-0 bg-[#F8F5F2] dark:bg-[#12100a] flex flex-col z-[120]">
            <SubHeader title={t('language')} />
            <div className="flex-1 overflow-y-auto">
                {[
                    { id: 'pt', label: 'Português (Brasil)', flag: '🇧🇷' },
                    { id: 'en', label: 'English (US)', flag: '🇺🇸' },
                    { id: 'es', label: 'Español (ES)', flag: '🇪🇸' }
                ].map((l) => (
                    <div 
                        key={l.id} 
                        onClick={() => {
                            if (confirm(`${t('confirmLanguageChange')} ${l.label}?`)) {
                                changeLanguage(l.id as any);
                            }
                        }}
                        className="w-full flex items-center justify-between p-6 bg-white dark:bg-[#1A1108]/30 border-b border-[#1A1108]/5 dark:border-white/5 active:bg-[#1A1108]/5"
                    >
                        <div className="flex items-center gap-4">
                            <span className="text-2xl">{l.flag}</span>
                            <span className={`text-sm font-bold ${lang === l.id ? 'text-[#D4AF37]' : 'text-leather dark:text-white'}`}>{l.label}</span>
                        </div>
                        {lang === l.id && <span className="material-icons text-[#D4AF37]">check</span>}
                    </div>
                ))}
            </div>
        </div>
    );

    const renderDataUsage = () => (
        <div className="absolute inset-0 bg-[#F8F5F2] dark:bg-[#12100a] flex flex-col z-[120]">
            <SubHeader title={t('dataUsage')} />
            <div className="flex-1 p-6 space-y-6">
                <div className="bg-white dark:bg-[#1A1108]/30 p-6 rounded-3xl border border-[#1A1108]/5 dark:border-white/5 space-y-4">
                    <div className="flex items-center gap-4">
                        <span className="material-icons text-blue-500">signal_cellular_alt</span>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-leather/40 dark:text-white/30">Conexão Atual</p>
                            <h4 className="text-xl font-black italic text-leather dark:text-white uppercase">{connectionType}</h4>
                        </div>
                    </div>
                    <p className="text-xs text-leather/60 dark:text-white/60 font-medium">Estamos otimizando o carregamento de imagens para economizar seu plano de dados.</p>
                </div>
            </div>
        </div>
    );

    const renderMetrics = () => (
        <div className="absolute inset-0 bg-[#F8F5F2] dark:bg-[#12100a] flex flex-col z-[120]">
            <SubHeader title={t('metrics')} />
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="bg-[#1A1108] p-8 rounded-[32px] text-white space-y-2 relative overflow-hidden shadow-2xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">{t('metrics_summary')}</p>
                    <h3 className="text-3xl font-black italic tracking-tighter tabular-nums">{Object.values(metricsData).reduce((a: any, b: any) => a + b, 0)}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: t('metrics_users'), value: metricsData.users, icon: 'groups' },
                        { label: t('metrics_events'), value: metricsData.events, icon: 'emoji_events' },
                        { label: t('metrics_news'), value: metricsData.news, icon: 'newspaper' },
                        { label: t('metrics_market'), value: metricsData.market, icon: 'storefront' },
                        { label: t('metrics_posts'), value: metricsData.posts, icon: 'forum' },
                        { label: t('metrics_banners'), value: metricsData.banners, icon: 'campaign' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white dark:bg-[#1A1108]/30 p-5 rounded-3xl border border-[#1A1108]/5 dark:border-white/5 space-y-3">
                            <span className="material-icons text-leather/30 dark:text-white/20">{stat.icon}</span>
                            <p className="text-[10px] font-black uppercase tracking-widest text-leather/30 dark:text-white/20">{stat.label}</p>
                            <h4 className="text-xl font-black italic text-leather dark:text-white">{stat.value}</h4>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    if (activeTab === 'EDIT_PROFILE') return renderEditProfile();
    if (activeTab === 'NOTIFICATIONS') return renderNotifications();
    if (activeTab === 'LANGUAGE') return renderLanguage();
    if (activeTab === 'DATA_USAGE') return renderDataUsage();
    if (activeTab === 'METRICS') return renderMetrics();

    return (
        <div className="absolute inset-0 bg-[#F8F5F2] dark:bg-[#12100a] flex flex-col z-[120] animate-in slide-in-from-right duration-300">
            <header className="px-6 py-6 border-b border-[#1A1108]/5 dark:border-white/5 flex items-center gap-4 bg-white dark:bg-[#12100a] sticky top-0 z-10 w-full">
                <button onClick={onBack} className="material-icons text-leather dark:text-white">arrow_back</button>
                <h2 className="text-xl font-black uppercase italic tracking-tight dark:text-white">{t('settings')}</h2>
            </header>

            <div className="flex-1 overflow-y-auto pb-12">
                <div className="px-6 py-4"><h3 className="text-[10px] font-black text-leather/40 dark:text-white/30 uppercase tracking-[0.2em]">Como você usa o +Vaquejada</h3></div>
                <SettingItem icon="person_outline" label={t('editProfile')} value={user?.name} onClick={() => setActiveTab('EDIT_PROFILE')} />
                <SettingItem icon="notifications_none" label={t('notifications')} onClick={() => setActiveTab('NOTIFICATIONS')} />
                
                <div className="px-6 py-4"><h3 className="text-[10px] font-black text-leather/40 dark:text-white/30 uppercase tracking-[0.2em]">Seu app e mídia</h3></div>
                <SettingItem icon="language" label={t('language')} value={lang.toUpperCase()} onClick={() => setActiveTab('LANGUAGE')} />
                <SettingItem icon="dark_mode" label={t('darkMode')} isToggle toggleKey="darkMode" />
                <SettingItem icon="monitor_weight" label={t('dataUsage')} value={connectionType} onClick={() => setActiveTab('DATA_USAGE')} />

                <div className="mt-8 px-6 space-y-4 text-center">
                    <button onClick={onLogout} className="w-full bg-red-50 dark:bg-red-950/20 text-red-500 font-black py-4 rounded-xl uppercase tracking-widest text-xs border border-red-100 dark:border-red-900/30 active:scale-95 transition-transform">{t('logout')}</button>
                </div>
            </div>

            {success && (
                <div className="fixed bottom-24 left-6 right-6 bg-green-500 text-white px-6 py-4 rounded-2xl shadow-xl z-[200] flex items-center gap-3">
                    <span className="material-icons">check_circle</span>
                    <p className="text-sm font-bold">{success}</p>
                </div>
            )}
        </div>
    );
};

export default SettingsView;
