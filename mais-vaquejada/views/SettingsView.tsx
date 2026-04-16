
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
                {/* Contact Buttons (Always visible for testing/usage) */}
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

                {isMaster && (
                    <div className="bg-white p-6 rounded-[32px] border border-leather/10 space-y-6 shadow-sm mt-8">
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 bg-leather/5 rounded-full flex items-center justify-center mb-2">
                                <span className="material-icons text-leather opacity-40 text-xl">settings</span>
                            </div>
                            <h3 className="text-[11px] font-black uppercase text-leather tracking-[0.2em] text-center">Configurações de Suporte</h3>
                            <p className="text-[9px] font-bold text-black/30 uppercase mt-1">Visível apenas para Administradores</p>
                        </div>
                        
                        <div className="space-y-6 pt-4">
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
                    </div>
                )}
                    </div>
                )}
                <div className="text-center pt-10 pb-10">
                    <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.3em]">Arena Vaquerama v1.0.0</p>
                </div>
            </div>
        </div>
    );

    const renderAbout = () => (
        <div className="absolute inset-0 bg-[#FBFBFB] flex flex-col z-[130] animate-in slide-in-from-right duration-300">
            <header className="px-6 py-8 border-b border-black/5 bg-white flex items-center gap-4 sticky top-0 z-10">
                <button onClick={() => setActiveTab('MAIN')} className="material-icons text-[#1A1108]">arrow_back</button>
                <div>
                    <h2 className="text-xl font-black uppercase italic tracking-tighter">Sobre o +Vaquejada</h2>
                    <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mt-1">Nossa história e compromisso</p>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-10 space-y-12 pb-24">
                {/* Brand Identity Card */}
                <div className="flex flex-col items-center text-center space-y-6">
                    <img src="/about-logo.png" className="w-32 h-32 object-contain" alt="+Vaquejada Logo" />
                    <div>
                        <h1 className="text-3xl font-black italic text-leather tracking-tighter uppercase">+VAQUEJADA</h1>
                        <p className="text-sm font-medium text-leather/60 max-w-[280px] mx-auto leading-relaxed mt-2">Fortalecendo o universo da vaquejada através da tecnologia.</p>
                    </div>
                    <div 
                        onClick={() => {
                            navigator.clipboard.writeText('63.713.232/0001-07');
                            setSuccess('CNPJ Copiado!');
                            setTimeout(() => setSuccess(null), 2000);
                        }}
                        className="bg-leather/5 border border-leather/10 px-6 py-4 rounded-[20px] cursor-pointer active:scale-95 transition-all group hover:bg-leather/10"
                    >
                        <p className="text-[9px] font-black text-leather/40 uppercase tracking-widest mb-1">Dados Institucionais</p>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-leather">CNPJ: 63.713.232/0001-07</span>
                            <span className="material-icons text-sm text-leather/30 group-hover:text-leather transition-colors">content_copy</span>
                        </div>
                    </div>
                </div>

                {/* Content Sections */}
                <div className="space-y-4">
                    <AboutSection title="SOBRE O +VAQUEJADA">
                        +Vaquejada é uma plataforma digital criada com o propósito de fortalecer, valorizar e conectar o universo da vaquejada por meio da tecnologia, da informação e da comunicação moderna.
                        <br /><br />
                        A proposta do aplicativo nasce da percepção de que a vaquejada, como manifestação cultural, esportiva, econômica e social, movimenta milhares de pessoas, profissionais, equipes, organizadores, parques, locutores, patrocinadores, empresários e admiradores em diferentes regiões do Brasil. Mesmo com toda essa força, muitas informações importantes ainda se encontram descentralizadas, dispersas ou de difícil acesso para o público.
                        <br /><br />
                        Diante disso, o +Vaquejada foi idealizado para funcionar como um ecossistema digital voltado à organização, divulgação, visibilidade, interação e fortalecimento desse setor, aproximando pessoas, eventos, oportunidades e experiências em um só ambiente.
                    </AboutSection>

                    <AboutSection title="NOSSO OBJETIVO">
                        O principal objetivo do +Vaquejada é construir uma plataforma sólida e relevante para o segmento, permitindo que usuários, organizadores, parceiros e anunciantes tenham acesso a um ambiente digital capaz de:
                        <ul className="list-disc pl-5 mt-4 space-y-2 text-sm font-medium text-leather/70">
                            <li>ampliar a visibilidade de eventos, circuitos e competições;</li>
                            <li>facilitar a conexão entre o público e o universo da vaquejada;</li>
                            <li>reunir informações importantes em um só lugar;</li>
                            <li>criar novas oportunidades de divulgação e negócios;</li>
                            <li>fortalecer a presença digital do setor;</li>
                            <li>incentivar a profissionalização da comunicação dentro desse mercado;</li>
                            <li>modernizar a forma como conteúdos, anúncios, campanhas e interações são apresentados ao público.</li>
                        </ul>
                    </AboutSection>

                    <AboutSection title="NOSSA MISSÃO">
                        A missão do +Vaquejada é conectar o ecossistema da vaquejada por meio da tecnologia, da informação e da valorização cultural, oferecendo uma plataforma acessível, útil e estratégica para usuários, organizadores, patrocinadores e demais participantes desse universo.
                    </AboutSection>

                    <AboutSection title="NOSSA VISÃO">
                        A visão do +Vaquejada é consolidar-se como uma referência digital no segmento, tornando-se uma plataforma reconhecida pela utilidade, credibilidade, inovação e capacidade de gerar valor real para a comunidade da vaquejada.
                    </AboutSection>

                    <AboutSection title="NOSSOS VALORES">
                        <div className="space-y-6">
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-leather mb-1">Valorização cultural</p>
                                <p className="text-sm font-medium text-leather/70">Reconhecemos a importância histórica, social e econômica da vaquejada e buscamos contribuir para sua presença digital com respeito e responsabilidade.</p>
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-leather mb-1">Inovação com propósito</p>
                                <p className="text-sm font-medium text-leather/70">A tecnologia utilizada na plataforma deve servir para facilitar, organizar, conectar e gerar utilidade prática, e não apenas para existir como recurso estético.</p>
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-leather mb-1">Respeito à comunidade</p>
                                <p className="text-sm font-medium text-leather/70">O app é pensado para servir pessoas reais: usuários, organizadores, patrocinadores, profissionais e admiradores do setor.</p>
                            </div>
                        </div>
                    </AboutSection>

                    <AboutSection title="O QUE PRETENDEMOS CONSTRUIR">
                        O +Vaquejada pretende construir, de forma progressiva e estruturada, um ambiente digital que possa oferecer divulgação de eventos, visibilidade institucional e comercial, e ferramentas de gestão modernas para o setor.
                    </AboutSection>

                    <AboutSection title="COMPROMISSO COM A EVOLUÇÃO">
                        O +Vaquejada está sendo desenvolvido para oferecer uma navegação intuitiva, clara e agradável. Recursos podem ser ajustados ou reformulados ao longo do tempo, sempre com o objetivo de melhorar a utilidade e a estabilidade do sistema.
                    </AboutSection>

                    {/* Final Board Message Card */}
                    <div className="bg-leather text-white p-8 rounded-[40px] space-y-6 shadow-2xl relative overflow-hidden group">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full group-hover:scale-110 transition-transform duration-700" />
                        <span className="material-icons text-white/40 text-4xl">format_quote</span>
                        <h3 className="text-xl font-black italic uppercase tracking-tighter">Mensagem Final da Diretoria</h3>
                        <p className="text-sm font-medium text-white/80 leading-relaxed italic">
                            "A Diretoria do +Vaquejada reafirma seu compromisso com a construção de uma plataforma séria, moderna e em constante evolução. Tecnologia e tradição podem caminhar juntas. Muito obrigado por fazer parte desta trajetória."
                        </p>
                        <div className="pt-6 border-t border-white/10 flex flex-col items-center">
                            <img src="/about-logo.png" className="w-16 h-16 object-contain brightness-0 invert opacity-40 mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Diretoria +Vaquejada</p>
                            <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-20 mt-4">Todos os direitos reservados © 2026</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (activeTab === 'EDIT_PROFILE') return renderEditProfile();
    if (activeTab === 'HELP') return renderHelp();
    if (activeTab === 'ABOUT') return renderAbout();


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
                <SettingItem icon="info_outline" label="Sobre o +Vaquejada" onClick={() => setActiveTab('ABOUT')} />

                
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

const AboutSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white border border-black/5 p-8 rounded-[32px] space-y-4 shadow-sm">
        <h3 className="text-[11px] font-black text-leather/40 uppercase tracking-[0.2em] border-b border-black/5 pb-4">{title}</h3>
        <div className="text-sm font-medium text-leather leading-relaxed">
            {children}
        </div>
    </div>
);

export default SettingsView;
