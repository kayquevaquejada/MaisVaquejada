
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

    const [profileData, setProfileData] = useState({
        name: user?.name || '',
        bio: user?.bio || '',
        avatar_url: user?.avatar_url || ''
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

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    name: profileData.name,
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
            // Padrão solicitado: userId/avatar.jpg
            const filePath = `${user.id}/avatar.jpg`;

            // 1. Upload para o bucket 'avatars'
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { 
                    upsert: true,
                    cacheControl: '3600'
                });

            if (uploadError) throw uploadError;

            // 2. Obter URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 3. Atualizar estado local
            setProfileData(prev => ({ ...prev, avatar_url: publicUrl }));
            
            // 4. Atualizar tabela profiles
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);
            
            if (updateError) throw updateError;

            if (onProfileUpdate) onProfileUpdate();
            setSuccess('Foto atualizada com sucesso!');
            setTimeout(() => setSuccess(null), 2000);
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            // Tratamento de erro amigável solicitado
            alert(`Erro ao enviar foto: ${error.message || 'Verifique as permissões de storage'}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleSetting = async (key: keyof typeof toggles) => {
        if (key === 'darkMode') {
            document.documentElement.classList.toggle('dark');
        }
        setToggles(prev => ({ ...prev, [key]: !prev[key] }));
        setSuccess(t('save'));
        setTimeout(() => setSuccess(null), 2000);
    };

    const SettingItem = ({ icon, label, onClick, color = "text-leather", value, isToggle, toggleKey }: any) => (
        <div className="w-full flex items-center justify-between p-4 bg-white/50 dark:bg-[#1A1108]/30 border-b border-[#1A1108]/5 dark:border-white/5 active:bg-[#1A1108]/5">
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
                        className="w-24 h-24 rounded-full border-2 border-[#D4AF37] overflow-hidden cursor-pointer relative"
                    >
                        <img src={profileData.avatar_url || `https://ui-avatars.com/api/?name=${profileData.name}&background=random`} className="w-full h-full object-cover" />
                        {loading && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                    <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest">Alterar foto do perfil</button>
                    <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
                </div>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-leather/40 uppercase tracking-widest">Nome</label>
                        <input className="w-full bg-white dark:bg-white/5 border border-[#1A1108]/5 dark:border-white/5 rounded-xl py-3 px-4 font-bold text-sm text-leather dark:text-white" value={profileData.name} onChange={e => setProfileData({ ...profileData, name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-leather/40 uppercase tracking-widest">Bio</label>
                        <textarea className="w-full bg-white dark:bg-white/5 border border-[#1A1108]/5 dark:border-white/5 rounded-xl py-3 px-4 font-medium text-sm text-leather dark:text-white" value={profileData.bio} onChange={e => setProfileData({ ...profileData, bio: e.target.value })} rows={3} />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderLanguage = () => (
        <div className="absolute inset-0 bg-[#F8F5F2] dark:bg-[#12100a] flex flex-col z-[120]">
            <SubHeader title={t('language')} />
            <div className="flex-1 overflow-y-auto">
                {['pt', 'en', 'es'].map((id) => (
                    <div key={id} onClick={() => confirm(t('confirmLanguageChange')) && changeLanguage(id as any)} className="p-6 bg-white dark:bg-[#1A1108]/30 border-b border-[#1A1108]/5 flex justify-between">
                        <span className="text-sm font-bold text-leather dark:text-white uppercase">{id}</span>
                        {lang === id && <span className="material-icons text-[#D4AF37]">check</span>}
                    </div>
                ))}
            </div>
        </div>
    );

    const renderDataUsage = () => (
        <div className="absolute inset-0 bg-[#F8F5F2] dark:bg-[#12100a] flex flex-col z-[120]">
            <SubHeader title={t('dataUsage')} />
            <div className="p-6">
                <div className="bg-white dark:bg-[#1A1108]/30 p-6 rounded-3xl border border-[#1A1108]/5">
                    <p className="text-[10px] font-black uppercase text-leather/40">Conexão</p>
                    <h4 className="text-xl font-black text-leather dark:text-white">{connectionType}</h4>
                </div>
            </div>
        </div>
    );

    if (activeTab === 'EDIT_PROFILE') return renderEditProfile();
    if (activeTab === 'LANGUAGE') return renderLanguage();
    if (activeTab === 'DATA_USAGE') return renderDataUsage();

    return (
        <div className="absolute inset-0 bg-[#F8F5F2] dark:bg-[#12100a] flex flex-col z-[120]">
            <header className="px-6 py-6 border-b border-[#1A1108]/5 dark:border-white/5 flex items-center gap-4 bg-white dark:bg-[#12100a]">
                <button onClick={onBack} className="material-icons text-leather dark:text-white">arrow_back</button>
                <h2 className="text-xl font-black uppercase italic dark:text-white">{t('settings')}</h2>
            </header>
            <div className="flex-1 overflow-y-auto pb-12">
                <div className="px-6 py-4 text-[10px] font-black text-leather/40 uppercase tracking-widest">Conta</div>
                <SettingItem icon="person_outline" label={t('editProfile')} value={user?.name} onClick={() => setActiveTab('EDIT_PROFILE')} />
                <div className="px-6 py-4 text-[10px] font-black text-leather/40 uppercase tracking-widest">App</div>
                <SettingItem icon="language" label={t('language')} value={lang.toUpperCase()} onClick={() => setActiveTab('LANGUAGE')} />
                <SettingItem icon="dark_mode" label={t('darkMode')} isToggle toggleKey="darkMode" />
                <SettingItem icon="monitor_weight" label={t('dataUsage')} value={connectionType} onClick={() => setActiveTab('DATA_USAGE')} />
                
                {user?.isMaster && (
                    <SettingItem icon="admin_panel_settings" label="Painel ADM" color="text-[#D4AF37]" onClick={() => window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view: 'ADMIN' } }))} />
                )}

                <div className="mt-8 px-6">
                    <button onClick={onLogout} className="w-full bg-red-50 dark:bg-red-950/20 text-red-500 font-black py-4 rounded-xl uppercase text-xs">Sair da Conta</button>
                </div>
            </div>
            {success && <div className="fixed bottom-24 left-6 right-6 bg-green-500 text-white p-4 rounded-2xl shadow-xl z-[200]">{success}</div>}
        </div>
    );
};

export default SettingsView;
