
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
    const [contactInfo, setContactInfo] = useState({
        whatsapp: '',
        instagram: '',
        email: ''
    });
    const [editContact, setEditContact] = useState({
        whatsapp: '',
        instagram: '',
        email: ''
    });

    const isMaster = user?.role === 'ADMIN_MASTER' || user?.isMaster || false;

    useEffect(() => {
        fetchContactInfo();
        if ('connection' in navigator) {
            const conn = (navigator as any).connection;
            setConnectionType(conn.effectiveType?.toUpperCase() || 'WiFi');
        }
    }, []);

    const fetchContactInfo = async () => {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'contact_info').single();
        if (data?.value) {
            setContactInfo(data.value);
            setEditContact(data.value);
        }
    };

    const handleSaveContact = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('app_settings')
                .upsert({ 
                    key: 'contact_info', 
                    value: editContact,
                    category: 'support'
                }, { onConflict: 'key' });

            if (error) throw error;
            setContactInfo(editContact);
            setSuccess('Contato atualizado!');
            setTimeout(() => setSuccess(null), 2000);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

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

    const renderHelp = () => (
        <div className="absolute inset-0 bg-[#FBFBFB] flex flex-col z-[120]">
            <SubHeader title="Entrar em contato" />
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {isMaster ? (
                    <div className="bg-white p-6 rounded-[32px] border border-black/5 space-y-6 shadow-sm">
                        <h3 className="text-[10px] font-black uppercase text-[#D4AF37] tracking-[0.2em] mb-2 text-center">Configurações de Suporte (Master Only)</h3>
                        
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">WhatsApp (Apenas números com DDD)</label>
                            <input 
                                className="w-full bg-neutral-50 border border-black/5 rounded-2xl py-4 px-5 font-bold text-sm text-leather outline-none focus:border-[#D4AF37]" 
                                value={editContact.whatsapp} 
                                onChange={e => setEditContact({ ...editContact, whatsapp: e.target.value })} 
                                placeholder="Ex: 5583999999999"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">Instagram (@usuario)</label>
                            <input 
                                className="w-full bg-neutral-50 border border-black/5 rounded-2xl py-4 px-5 font-bold text-sm text-leather outline-none focus:border-[#D4AF37]" 
                                value={editContact.instagram} 
                                onChange={e => setEditContact({ ...editContact, instagram: e.target.value })} 
                                placeholder="Ex: arenadigital"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">E-mail</label>
                            <input 
                                className="w-full bg-neutral-50 border border-black/5 rounded-2xl py-4 px-5 font-bold text-sm text-leather outline-none focus:border-[#D4AF37]" 
                                value={editContact.email} 
                                onChange={e => setEditContact({ ...editContact, email: e.target.value })} 
                                placeholder="Ex: contato@arena.com"
                            />
                        </div>

                        <button 
                            disabled={loading}
                            onClick={handleSaveContact} 
                            className="w-full bg-leather text-white py-5 rounded-[24px] font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Salvando...' : 'Atualizar Contatos'}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <button 
                            onClick={() => window.open(`https://wa.me/${contactInfo.whatsapp}`, '_blank')}
                            className="w-full bg-[#25D366] text-white p-6 rounded-[32px] flex items-center gap-4 active:scale-95 transition-all shadow-lg shadow-[#25D366]/20"
                        >
                            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                                <span className="material-icons">chat</span>
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">WhatsApp</p>
                                <p className="text-sm font-black italic tracking-tighter uppercase">Falar com Suporte</p>
                            </div>
                            <span className="material-icons ml-auto opacity-40">chevron_right</span>
                        </button>

                        <button 
                            onClick={() => window.open(`https://instagram.com/${contactInfo.instagram}`, '_blank')}
                            className="w-full bg-gradient-to-tr from-[#FFB700] via-[#FF0069] to-[#7638FF] text-white p-6 rounded-[32px] flex items-center gap-4 active:scale-95 transition-all shadow-lg"
                        >
                            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                                <span className="material-icons">camera_alt</span>
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Instagram</p>
                                <p className="text-sm font-black italic tracking-tighter uppercase">Seguir Oficial</p>
                            </div>
                            <span className="material-icons ml-auto opacity-40">chevron_right</span>
                        </button>

                        <button 
                            onClick={() => window.open(`mailto:${contactInfo.email}`, '_blank')}
                            className="w-full bg-white border border-black/5 text-leather p-6 rounded-[32px] flex items-center gap-4 active:scale-95 transition-all shadow-sm"
                        >
                            <div className="w-10 h-10 bg-leather/5 rounded-2xl flex items-center justify-center">
                                <span className="material-icons text-leather">mail</span>
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase text-black/30 tracking-widest">E-mail</p>
                                <p className="text-sm font-black italic tracking-tighter uppercase">Enviar Mensagem</p>
                            </div>
                            <span className="material-icons ml-auto opacity-10">chevron_right</span>
                        </button>
                    </div>
                )}
                <div className="text-center pt-10">
                    <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.3em]">Arena Vaquerama v1.0.0</p>
                </div>
            </div>
        </div>
    );

    if (activeTab === 'EDIT_PROFILE') return renderEditProfile();
    if (activeTab === 'HELP') return renderHelp();


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
                <SettingItem icon="help_outline" label="Entrar em contato" onClick={() => setActiveTab('HELP')} />

                
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
