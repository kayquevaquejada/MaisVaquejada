
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';

interface SettingsViewProps {
    user: User | null;
    onBack: () => void;
    onLogout: () => void;
    onProfileUpdate?: () => void;
    onAdminView?: () => void;
}

type SettingsTab = 'MAIN' | 'EDIT_PROFILE' | 'PRIVACY' | 'SECURITY' | 'NOTIFICATIONS' | 'HELP' | 'ABOUT' | 'ACTIVITY' | 'BLOCKED' | 'LANGUAGE' | 'METRICS' | 'DATA_USAGE';

const SettingsView: React.FC<SettingsViewProps> = ({ user, onBack, onLogout, onProfileUpdate, onAdminView }) => {
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
        showOnlineStatus: true
    });

    const [connectionType, setConnectionType] = useState<string>('4G');

    useEffect(() => {
        if ('connection' in navigator) {
            const conn = (navigator as any).connection;
            setConnectionType(conn.effectiveType?.toUpperCase() || 'WiFi');
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
            const filePath = `${user.id}/avatar.jpg`;
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true, cacheControl: '3600' });

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
            setSuccess('Foto atualizada com sucesso!');
            setTimeout(() => setSuccess(null), 2000);
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            alert(`Erro ao enviar foto: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleSetting = async (key: keyof typeof toggles) => {
        setToggles(prev => ({ ...prev, [key]: !prev[key] }));
        setSuccess(t('save'));
        setTimeout(() => setSuccess(null), 2000);
    };

    const SettingItem = ({ icon, label, onClick, color = "text-[#1A1108]", value, isToggle, toggleKey }: any) => (
        <div className="w-full flex items-center justify-between p-5 bg-white border-b border-black/5 active:bg-black/5 transition-colors">
            <button onClick={onClick} className="flex-1 flex items-center gap-4 text-left">
                <span className={`material-icons ${color} opacity-80 text-[22px]`}>{icon}</span>
                <span className="text-[15px] font-bold text-[#1A1108]">{label}</span>
            </button>
            <div className="flex items-center gap-2">
                {value && <span className="text-sm font-medium text-black/40">{value}</span>}
                {isToggle ? (
                    <button
                        onClick={() => toggleSetting(toggleKey)}
                        className={`w-11 h-6 rounded-full transition-all relative ${toggles[toggleKey as keyof typeof toggles] ? 'bg-[#D4AF37]' : 'bg-black/10'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${toggles[toggleKey as keyof typeof toggles] ? 'left-6' : 'left-1'}`} />
                    </button>
                ) : (
                    <span className="material-icons text-black/20 text-xl">chevron_right</span>
                )}
            </div>
        </div>
    );

    const SubHeader = ({ title, onBackTab = 'MAIN' }: { title: string, onBackTab?: SettingsTab }) => (
        <header className="px-6 py-6 border-b border-black/5 flex items-center gap-4 bg-white sticky top-0 z-10 w-full">
            <button onClick={() => setActiveTab(onBackTab)} className="material-icons text-[#1A1108]">arrow_back</button>
            <h2 className="text-xl font-black uppercase italic tracking-tight">{title}</h2>
        </header>
    );

    const renderEditProfile = () => (
        <div className="absolute inset-0 bg-[#FBFBFB] flex flex-col z-[120]">
            <header className="px-6 py-6 border-b border-black/5 flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                    <button onClick={() => setActiveTab('MAIN')} className="material-icons text-[#1A1108]">close</button>
                    <h2 className="text-xl font-black uppercase italic tracking-tight">{t('editProfile')}</h2>
                </div>
                <button onClick={handleSaveProfile} className="text-[#D4AF37] font-black text-xs uppercase tracking-widest">{t('save')}</button>
            </header>
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="flex flex-col items-center gap-4">
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-28 h-28 rounded-full border-4 border-[#D4AF37]/20 p-1 relative cursor-pointer group"
                    >
                        <img src={profileData.avatar_url || `https://ui-avatars.com/api/?name=${profileData.name}&background=random`} className="w-full h-full rounded-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="material-icons text-white">photo_camera</span>
                        </div>
                        {loading && (
                            <div className="absolute inset-0 bg-white/60 rounded-full flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                    <button onClick={() => fileInputRef.current?.click()} className="text-[11px] font-black text-[#D4AF37] uppercase tracking-widest">Alterar foto do perfil</button>
                    <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
                </div>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] ml-1">Nome</label>
                        <input className="w-full bg-white border border-black/5 rounded-2xl py-4 px-5 font-bold text-[15px] outline-none focus:border-[#D4AF37] transition-all" value={profileData.name} onChange={e => setProfileData({ ...profileData, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em] ml-1">Bio</label>
                        <textarea className="w-full bg-white border border-black/5 rounded-2xl py-4 px-5 font-medium text-[15px] outline-none focus:border-[#D4AF37] transition-all" value={profileData.bio} onChange={e => setProfileData({ ...profileData, bio: e.target.value })} rows={4} />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderLanguage = () => (
        <div className="absolute inset-0 bg-[#FBFBFB] flex flex-col z-[120]">
            <SubHeader title={t('language')} />
            <div className="flex-1 overflow-y-auto pt-4">
                {['pt', 'en', 'es'].map((id) => (
                    <div key={id} onClick={() => confirm(t('confirmLanguageChange')) && changeLanguage(id as any)} className="p-6 bg-white border-b border-black/5 flex justify-between items-center active:bg-black/5">
                        <span className="text-[15px] font-bold text-[#1A1108] uppercase tracking-widest">{id === 'pt' ? 'Português' : id === 'en' ? 'English' : 'Español'}</span>
                        {lang === id && <span className="material-icons text-[#D4AF37]">check</span>}
                    </div>
                ))}
            </div>
        </div>
    );

    if (activeTab === 'EDIT_PROFILE') return renderEditProfile();
    if (activeTab === 'LANGUAGE') return renderLanguage();


    return (
        <div className="absolute inset-0 bg-[#FBFBFB] flex flex-col z-[120]">
            <header className="px-6 py-8 border-b border-black/5 bg-white flex items-center gap-4">
                <button onClick={onBack} className="material-icons text-[#1A1108]">arrow_back</button>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Ajustes</h2>
            </header>
            <div className="flex-1 overflow-y-auto">
                <div className="px-6 py-6 bg-neutral-50 text-[10px] font-black text-black/30 uppercase tracking-[0.3em] border-b border-black/5">Conta</div>
                <SettingItem icon="person_outline" label={t('editProfile')} value={user?.name} onClick={() => setActiveTab('EDIT_PROFILE')} />
                
                <div className="px-6 py-6 bg-neutral-50 text-[10px] font-black text-black/30 uppercase tracking-[0.3em] border-b border-black/5">App</div>
                <SettingItem icon="language" label={t('language')} value={lang.toUpperCase()} onClick={() => setActiveTab('LANGUAGE')} />

                
                {/* Administrative Access */}
                {(user?.isMaster || user?.role === 'ADMIN' || user?.role === 'ADMIN_MASTER' || user?.admin_mercado || user?.admin_social || user?.admin_eventos || user?.admin_noticias) && (
                    <>
                        <div className="px-6 py-6 bg-neutral-50 text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em] border-b border-black/5">Administração</div>
                        <SettingItem icon="security" label="Acesso Painel ADM" color="text-[#D4AF37]" onClick={() => { if(onAdminView) onAdminView(); else window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view: 'ADMIN' } })); }} />
                    </>
                )}


                <div className="p-8 mt-4">
                    <button onClick={onLogout} className="w-full bg-red-50 text-red-600 font-black py-5 rounded-[24px] uppercase text-[11px] tracking-widest active:scale-95 transition-all">Sair da Conta</button>
                </div>
            </div>
            {success && <div className="fixed bottom-24 left-6 right-6 bg-black text-white p-4 rounded-2xl shadow-2xl z-[200] text-center font-bold text-sm animate-in fade-in slide-in-from-bottom-4 transition-all">{success}</div>}
        </div>
    );
};

export default SettingsView;
