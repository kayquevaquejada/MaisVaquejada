import React, { useState, useEffect } from 'react';
import { User, View } from '../types';
import { supabase } from '../lib/supabase';

interface AdminViewProps {
    user: any;
}

type AdminTab = 'MAIN' | 'USERS' | 'MERCADO' | 'SOCIAL' | 'EVENTOS' | 'NOTICIAS';

const AdminView: React.FC<AdminViewProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('MAIN');
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [success, setSuccess] = useState<string | null>(null);
    const [showFullUserList, setShowFullUserList] = useState(false);
    const [userListSort, setUserListSort] = useState<'name' | 'newest'>('newest');
    
    // Stats for Main Menu
    const [totalUsersCount, setTotalUsersCount] = useState(0);

    // View States for Events and News
    const [subviewEvents, setSubviewEvents] = useState<'HOME'|'CREATE'|'LIST'>('HOME');
    const [subviewNews, setSubviewNews] = useState<'HOME'|'CREATE'|'LIST'>('HOME');
    const [subviewMercado, setSubviewMercado] = useState<'HOME'|'LIST'>('HOME');
    const [subviewSocial, setSubviewSocial] = useState<'HOME'|'LIST'>('HOME');

    const [eventsList, setEventsList] = useState<any[]>([]);
    const [newsList, setNewsList] = useState<any[]>([]);
    const [marketList, setMarketList] = useState<any[]>([]);
    const [postsList, setPostsList] = useState<any[]>([]);
    const [bannersList, setBannersList] = useState<any[]>([]);

    const [eventForm, setEventForm] = useState<any>({});
    const [newsForm, setNewsForm] = useState<any>({ type: 'info' });
    const [bannerForm, setBannerForm] = useState<any>({});

    const isMaster = user?.isMaster || false;
    const hasMercado = isMaster || user?.admin_mercado;
    const hasSocial = isMaster || user?.admin_social;
    const hasEventos = isMaster || user?.admin_eventos;
    const hasNoticias = isMaster || user?.admin_noticias;

    useEffect(() => {
        if (isMaster) fetchTotalUsers();
        if (hasEventos) fetchEvents();
        if (hasNoticias && subviewNews === 'LIST') fetchNews();
        if (hasMercado && subviewMercado === 'LIST') fetchMarket();
        if (hasSocial) {
             fetchPosts();
             fetchBanners();
        }
    }, [isMaster, hasEventos, subviewEvents, hasNoticias, subviewNews, hasMercado, subviewMercado, hasSocial, subviewSocial]);

    const fetchTotalUsers = async () => {
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        if (count !== null) setTotalUsersCount(count);
    };

    const fetchEvents = async () => {
        setLoading(true);
        const { data } = await supabase.from('events').select('*').order('created_at', { ascending: false });
        if (data) setEventsList(data);
        setLoading(false);
    };

    const fetchNews = async () => {
        setLoading(true);
        const { data } = await supabase.from('news').select('*').order('created_at', { ascending: false });
        if (data) setNewsList(data);
        setLoading(false);
    };

    const fetchMarket = async () => {
        setLoading(true);
        const { data } = await supabase.from('market_items').select('*').order('created_at', { ascending: false });
        if (data) setMarketList(data);
        setLoading(false);
    };

    const fetchPosts = async () => {
        setLoading(true);
        const { data } = await supabase.from('posts').select(`*, profiles!posts_user_id_fkey(username, avatar_url, full_name)`).order('created_at', { ascending: false });
        if (data) setPostsList(data);
        setLoading(false);
    };

    const fetchBanners = async () => {
        setLoading(true);
        const { data } = await supabase.from('banners').select('*').order('created_at', { ascending: false });
        if (data) setBannersList(data);
        setLoading(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number | 'cover') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('vaquejadas')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('vaquejadas')
                .getPublicUrl(filePath);

            if (index === 'cover') {
                setEventForm({ ...eventForm, image_url: publicUrl });
            } else {
                const currentGallery = Array.isArray(eventForm.gallery) ? [...eventForm.gallery] : [];
                // Fill with empty strings until the index if needed, though we usually work with 4 fixed slots
                const newGallery = [...currentGallery];
                newGallery[index] = publicUrl;
                setEventForm({ ...eventForm, gallery: newGallery });
            }
        } catch (error: any) {
            alert('Erro no upload: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Clean empty strings from gallery before saving
            const cleanGallery = (eventForm.gallery || []).filter((url: string) => url && url.trim() !== '');
            const payload = { ...eventForm, gallery: cleanGallery, created_by: user.id };
            let error;
            if (eventForm.id) {
                 ({ error } = await supabase.from('events').update(payload).eq('id', eventForm.id));
            } else {
                 ({ error } = await supabase.from('events').insert([payload]));
            }
            if (error) throw error;
            alert(eventForm.id ? 'Evento atualizado!' : 'Vaquejada criada com sucesso!');
            setSubviewEvents('HOME');
            setEventForm({});
        } catch (err: any) { alert(err.message); }
        finally { setLoading(false); }
    };

    const toggleHideEvent = async (e_id: string, current: boolean) => {
        setLoading(true);
        const { error } = await supabase.from('events').update({ is_paused: !current }).eq('id', e_id);
        if (!error) fetchEvents();
        else { alert('Erro: ' + error.message); setLoading(false); }
    };

    const handleNewsFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'pdf') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_news_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('vaquejadas')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('vaquejadas')
                .getPublicUrl(filePath);

            if (type === 'image') {
                setNewsForm({ ...newsForm, image_url: publicUrl });
            } else {
                setNewsForm({ ...newsForm, pdf_url: publicUrl });
            }
        } catch (error: any) {
            alert('Erro no upload: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNews = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...newsForm, created_by: user.id };
            let error;
            if (newsForm.id) {
                 ({ error } = await supabase.from('news').update(payload).eq('id', newsForm.id));
            } else {
                 ({ error } = await supabase.from('news').insert([payload]));
            }
            if (error) throw error;
            alert('Notícia publicada com sucesso!');
            setSubviewNews('HOME');
            setNewsForm({ type: 'info' });
        } catch (err: any) { alert(err.message); }
        finally { setLoading(false); }
    };

    const toggleHideNews = async (n_id: string, current: boolean) => {
        setLoading(true);
        const { error } = await supabase.from('news').update({ is_paused: !current }).eq('id', n_id);
        if (!error) fetchNews();
        else { alert('Erro: ' + error.message); setLoading(false); }
    };

    // Marketplace Moderation
    const updateMarketStatus = async (m_id: string, newStatus: string) => {
        setLoading(true);
        const { error } = await supabase.from('market_items').update({ status: newStatus }).eq('id', m_id);
        if (!error) fetchMarket();
        else { alert('Erro: ' + error.message); setLoading(false); }
    };

    // Social Moderation
    const toggleHidePost = async (p_id: string, current: boolean) => {
        setLoading(true);
        const { error } = await supabase.from('posts').update({ is_hidden: !current }).eq('id', p_id);
        if (!error) fetchPosts();
        else { alert('Erro ao ocultar post: ' + error.message); setLoading(false); }
    };

    const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_banner.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('vaquejadas').upload(fileName, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('vaquejadas').getPublicUrl(fileName);
            setBannerForm({ ...bannerForm, image_url: publicUrl });
        } catch (err: any) { alert(err.message); }
        finally { setLoading(false); }
    };

    const handleSaveBanner = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            let error;
            if (bannerForm.id) {
                ({ error } = await supabase.from('banners').update(bannerForm).eq('id', bannerForm.id));
            } else {
                ({ error } = await supabase.from('banners').insert([bannerForm]));
            }
            if (error) throw error;
            setBannerForm({});
            fetchBanners();
            alert('Propaganda salva!');
        } catch (err: any) { alert(err.message); }
        finally { setLoading(false); }
    };

    const deleteBanner = async (id: string) => {
        if (!confirm('Excluir esta propaganda?')) return;
        setLoading(true);
        const { error } = await supabase.from('banners').delete().eq('id', id);
        if (!error) fetchBanners();
        setLoading(false);
    };

    // --- REUSABLE COMPONENTS ---

    const SubHeader = ({ title, onBackTab = 'MAIN' }: { title: string, onBackTab?: AdminTab }) => (
        <header className="px-6 py-6 border-b border-[#1A1108]/5 flex items-center gap-4 bg-[#F8F5F2] sticky top-0 z-10 w-full">
            <button onClick={() => setActiveTab(onBackTab)} className="material-icons text-leather active:scale-90 transition-transform">arrow_back</button>
            <h2 className="text-xl font-black uppercase italic tracking-tight text-leather">{title}</h2>
        </header>
    );

    const MenuItem = ({ icon, label, onClick, badge }: any) => (
        <div className="w-full flex items-center justify-between p-4 bg-white/50 border-b border-[#1A1108]/5 active:bg-[#1A1108]/5 transition-colors cursor-pointer" onClick={onClick}>
            <div className="flex-1 flex items-center gap-4 text-left">
                <span className={`material-icons text-[#D4AF37]`}>{icon}</span>
                <span className="text-sm font-bold text-leather">{label}</span>
            </div>
            <div className="flex items-center gap-3">
                {badge && <span className="text-xs font-black text-[#D4AF37] px-2 py-1 bg-[#D4AF37]/10 rounded-lg">{badge}</span>}
                <span className="material-icons text-leather/20">chevron_right</span>
            </div>
        </div>
    );

    const SectionTitle = ({ title }: { title: string }) => (
        <div className="px-6 py-4">
            <h3 className="text-[10px] font-black text-leather/40 uppercase tracking-[0.2em]">{title}</h3>
        </div>
    );

    // --- USER PERMISSION MANAGEMENT LOGIC ---

    const searchUsers = async (query: string) => {
        setSearchQuery(query);
        if (query.trim().length === 0) {
            setSearchResults([]);
            return;
        }

        const { data } = await supabase
            .from('profiles')
            .select('*')
            .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,username.ilike.%${query}%`)
            .limit(10);
        
        if (data) setSearchResults(data);
    };

    const toggleSubAdminPermission = async (userId: string, column: string, currentValue: boolean) => {
        if (!isMaster) {
            alert("Apenas o Master pode alterar permissões!");
            return;
        }
        
        try {
            setLoading(true);
            const { error } = await supabase
                .from('profiles')
                .update({ [column]: !currentValue })
                .eq('id', userId);
            
            if (error) throw error;
            // Update local state results
            setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, [column]: !currentValue } : u));
            setSuccess(currentValue ? 'Permissão removida' : 'Permissão concedida!');
            setTimeout(() => setSuccess(null), 1500);
        } catch (err: any) {
            alert('Erro ao atualizar permissão: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const deleteUser = async (userId: string, name: string) => {
        if (!isMaster) return;
        if (confirm(`Atenção: Tem certeza absoluta que deseja DELETAR o usuário ${name} e toda a sua conta? Esta ação é irreversível.`)) {
            try {
                 const { error } = await supabase
                    .from('profiles')
                    .delete()
                    .eq('id', userId);
                
                if (error) throw error;
                alert('Usuário removido da base de dados com sucesso.');
                fetchTotalUsers();
                setSearchResults(prev => prev.filter(u => u.id !== userId));
            } catch (err: any) {
                alert('Erro ao excluir conta: ' + err.message);
            }
        }
    };

    const PermissionManager = () => (
        <div className="p-6">
            <h4 className="text-xs font-black text-leather uppercase tracking-widest mb-2">Classificar Administrativos</h4>
            <p className="text-[10px] text-leather/60 mb-4 font-medium leading-relaxed">Localize usuários e selecione os módulos aos quais eles terão acesso administrativo restrito.</p>
            
            <input 
                type="text" 
                placeholder="Buscar por @username, nome ou email..."
                className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-4 text-sm text-leather mb-4 outline-none focus:border-[#D4AF37] shadow-sm"
                value={searchQuery}
                onChange={(e) => searchUsers(e.target.value)}
            />

            {searchResults.length > 0 && (
                <div className="space-y-3 mt-4">
                    {searchResults.map(result => (
                        <div key={result.id} className="bg-white border border-[#1A1108]/5 p-4 rounded-2xl shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <img src={result.avatar_url || `https://ui-avatars.com/api/?name=${result.name || result.username}`} className="w-10 h-10 rounded-full border border-leather/5" />
                                <div>
                                    <p className="font-bold text-sm text-leather leading-tight">{result.name || result.full_name}</p>
                                    <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-widest">@{result.username}</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => toggleSubAdminPermission(result.id, 'admin_mercado', result.admin_mercado)}
                                    className={`py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-tighter flex items-center justify-center gap-1.5 transition-all border ${
                                        result.admin_mercado ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20' : 'bg-neutral-50 text-neutral-400 border-neutral-100'
                                    }`}
                                >
                                    <span className="material-icons text-sm">{result.admin_mercado ? 'check_circle' : 'add'}</span>
                                    Mercado
                                </button>
                                <button 
                                    onClick={() => toggleSubAdminPermission(result.id, 'admin_social', result.admin_social)}
                                    className={`py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-tighter flex items-center justify-center gap-1.5 transition-all border ${
                                        result.admin_social ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20' : 'bg-neutral-50 text-neutral-400 border-neutral-100'
                                    }`}
                                >
                                    <span className="material-icons text-sm">{result.admin_social ? 'check_circle' : 'add'}</span>
                                    Propaganda
                                </button>
                                <button 
                                    onClick={() => toggleSubAdminPermission(result.id, 'admin_eventos', result.admin_eventos)}
                                    className={`py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-tighter flex items-center justify-center gap-1.5 transition-all border ${
                                        result.admin_eventos ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20' : 'bg-neutral-50 text-neutral-400 border-neutral-100'
                                    }`}
                                >
                                    <span className="material-icons text-sm">{result.admin_eventos ? 'check_circle' : 'add'}</span>
                                    Vaquejadas
                                </button>
                                <button 
                                    onClick={() => toggleSubAdminPermission(result.id, 'admin_noticias', result.admin_noticias)}
                                    className={`py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-tighter flex items-center justify-center gap-1.5 transition-all border ${
                                        result.admin_noticias ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20' : 'bg-neutral-50 text-neutral-400 border-neutral-100'
                                    }`}
                                >
                                    <span className="material-icons text-sm">{result.admin_noticias ? 'check_circle' : 'add'}</span>
                                    Notícias
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // --- SPECIFIC VIEWS ---

    const renderUsersView = () => {
        const sortedUsers = [...searchResults].sort((a, b) => {
            if (userListSort === 'name') {
                return (a.full_name || a.name || '').localeCompare(b.full_name || b.name || '');
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        return (
            <div className="absolute inset-0 bg-[#F8F5F2] flex flex-col z-[120]">
                <SubHeader title="Base de Usuários" />
                <div className="flex-1 overflow-y-auto pb-20">
                    {isMaster && (
                        <>
                            <SectionTitle title="Hierarquia" />
                            <PermissionManager />
                        </>
                    )}
                    
                    <SectionTitle title="Estatísticas da Base" />
                    <div 
                        onClick={async () => {
                            setLoading(true);
                            const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
                            if (data) setSearchResults(data);
                            setShowFullUserList(!showFullUserList);
                            setLoading(false);
                        }}
                        className="mx-6 p-4 flex gap-4 bg-white rounded-2xl border border-[#1A1108]/5 active:scale-95 transition-transform cursor-pointer shadow-sm"
                    >
                        <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-full flex items-center justify-center">
                            <span className="material-icons text-[#D4AF37]">group</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-xl font-black text-leather">{totalUsersCount}</p>
                            <p className="text-[10px] text-leather/40 uppercase font-black tracking-widest leading-tight">Contas Registradas</p>
                            <p className="text-[8px] text-[#D4AF37] font-bold uppercase mt-1">Clique para ver lista completa</p>
                        </div>
                        <span className="material-icons text-leather/20 self-center">
                            {showFullUserList ? 'expand_less' : 'expand_more'}
                        </span>
                    </div>

                    {showFullUserList && (
                        <div className="px-6 mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex gap-2 mb-2">
                                <button 
                                    onClick={() => setUserListSort('newest')}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                                        userListSort === 'newest' ? 'bg-leather text-white border-leather' : 'bg-white text-leather/40 border-leather/5'
                                    }`}
                                >ORDEM LOGIN</button>
                                <button 
                                    onClick={() => setUserListSort('name')}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                                        userListSort === 'name' ? 'bg-leather text-white border-leather' : 'bg-white text-leather/40 border-leather/5'
                                    }`}
                                >ORDEM ALFABÉTICA</button>
                            </div>

                            {sortedUsers.map(u => (
                                <div key={u.id} className="bg-white border border-leather/5 p-4 rounded-xl flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-leather/5 flex items-center justify-center overflow-hidden border border-leather/10">
                                            {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : <span className="material-icons text-leather/20 text-sm">person</span>}
                                        </div>
                                        <div>
                                            <p className="font-bold text-xs text-leather leading-tight">{u.full_name || u.name || 'Sem Nome'}</p>
                                            <p className="text-[9px] text-leather/40 lowercase">@{u.username || 'user'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-leather/60 uppercase">{new Date(u.created_at).toLocaleDateString('pt-BR')}</p>
                                        <p className="text-[7px] text-[#D4AF37] font-black uppercase">{u.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <SectionTitle title="Ações Rápidas" />
                    <div className="px-6 space-y-4">
                        <div className="bg-white/50 border border-red-500/10 p-6 rounded-2xl">
                            <h3 className="text-xs font-black text-red-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="material-icons text-red-500 text-[16px]">warning</span>
                                Excluir Conta Manualmente
                            </h3>
                            <input 
                                type="text" 
                                placeholder="Buscar por @username, nome ou email..."
                                className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-4 text-sm text-leather mb-4 outline-none focus:border-red-500/50 shadow-sm"
                                value={searchQuery}
                                onChange={(e) => searchUsers(e.target.value)}
                            />
                            <div className="space-y-2">
                                {searchResults.map(result => (
                                    <div key={result.id} className="bg-white border border-red-500/10 p-3 rounded-xl flex items-center justify-between shadow-sm">
                                        <div>
                                            <p className="font-bold text-sm text-leather">{result.name || result.full_name}</p>
                                            <p className="text-[10px] text-leather/60">@{result.username}</p>
                                        </div>
                                        <button 
                                            onClick={() => deleteUser(result.id, result.name || result.username)}
                                            className="px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-md shadow-red-500/20"
                                        >
                                            Deletar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {success && (
                    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 bg-leather text-[#D4AF37] rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl z-[300] animate-in slide-in-from-bottom duration-300">
                        {success}
                    </div>
                )}
            </div>
        );
    };

    const renderMercadoView = () => {
        if (subviewMercado === 'LIST') {
            return (
                <div className="absolute inset-0 bg-[#F8F5F2] flex flex-col z-[120]">
                    <header className="px-6 py-6 border-b border-[#1A1108]/5 flex items-center gap-4 bg-[#F8F5F2] sticky top-0 z-10 w-full">
                        <button onClick={() => setSubviewMercado('HOME')} className="material-icons text-leather active:scale-90 transition-transform">arrow_back</button>
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-leather">Moderação do Mercado</h2>
                    </header>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {marketList.length === 0 ? <p className="text-center text-xs opacity-50 py-10 font-bold uppercase tracking-widest">Nenhum anúncio criado.</p> : marketList.map((ad) => (
                            <div key={ad.id} className={`bg-white border rounded-xl p-4 flex flex-col gap-3 ${ad.status === 'rejected' ? 'border-red-300 opacity-50' : ad.status === 'pending' ? 'border-yellow-400' : 'border-[#1A1108]/10'}`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${ad.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {ad.status === 'approved' ? 'APROVADO' : ad.status === 'pending' ? 'PENDENTE' : 'REJEITADO'}
                                            </span>
                                            <span className="text-[10px] uppercase font-bold text-leather/60">{ad.price}</span>
                                        </div>
                                        <h4 className="font-bold text-sm leading-tight text-leather">{ad.title}</h4>
                                        <p className="text-[10px] text-leather/60 mt-0.5"><span className="material-icons text-[10px] mr-1">place</span>{ad.loc}</p>
                                    </div>
                                    <img src={ad.img} className="w-12 h-12 object-cover rounded shadow-sm shrink-0" alt="Anúncio" />
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#1A1108]/5">
                                    <button onClick={() => updateMarketStatus(ad.id, 'approved')} disabled={ad.status === 'approved'} className="text-[9px] font-black uppercase tracking-widest bg-green-500 text-white rounded-lg py-2 disabled:opacity-30">Aprovar Anúncio</button>
                                    <button onClick={() => updateMarketStatus(ad.id, 'rejected')} disabled={ad.status === 'rejected'} className="text-[9px] font-black uppercase tracking-widest bg-red-100 text-red-600 rounded-lg py-2 disabled:opacity-30">Ocultar/Rejeitar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="absolute inset-0 bg-[#F8F5F2] flex flex-col z-[120]">
                <SubHeader title="Gestão do Mercado" />
                <div className="flex-1 overflow-y-auto">
                    <SectionTitle title="Anúncios" />
                    <div className="px-6 mb-6">
                        <button onClick={() => setSubviewMercado('LIST')} className="w-full bg-white border border-[#1A1108]/10 text-leather p-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-between active:scale-95 shadow-sm group">
                            <div className="flex items-center gap-3">
                                <div className="bg-[#D4AF37]/10 w-10 h-10 rounded-lg flex items-center justify-center">
                                    <span className="material-icons text-[#D4AF37]">fact_check</span>
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-sm text-leather">Mural de Aprovação</p>
                                    <p className="text-[9px] text-leather/40 uppercase">Aprovar / Ocultar Produtos</p>
                                </div>
                            </div>
                            <span className="material-icons text-leather/20 group-hover:text-[#D4AF37] transition-colors">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderSocialView = () => {
        if (subviewSocial === 'LIST') {
            return (
                <div className="absolute inset-0 bg-[#F8F5F2] flex flex-col z-[120]">
                    <header className="px-6 py-6 border-b border-[#1A1108]/5 flex items-center gap-4 bg-[#F8F5F2] sticky top-0 z-10 w-full shadow-sm">
                        <button onClick={() => setSubviewSocial('HOME')} className="material-icons text-leather active:scale-90 transition-transform">arrow_back</button>
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-leather">Moderação de Posts</h2>
                    </header>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {postsList.length === 0 ? <p className="text-center text-xs opacity-50 py-10 font-bold uppercase tracking-widest">Nenhum post registrado no banco.</p> : postsList.map((post) => (
                            <div key={post.id} className={`bg-white border rounded-xl p-4 flex flex-col gap-3 ${post.is_hidden ? 'border-red-300 bg-red-50/50 opacity-70' : 'border-[#1A1108]/10'}`}>
                                <div className="flex items-center gap-3">
                                    <img src={post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${post.profiles?.username}`} className="w-8 h-8 rounded-full shadow-sm" alt="User" />
                                    <div className="flex-1">
                                        <p className="font-bold text-xs text-leather leading-tight">@{post.profiles?.username || 'user_unknown'}</p>
                                        <p className="text-[9px] text-leather/40">ID: {post.id.split('-')[0]}</p>
                                    </div>
                                    <button onClick={() => toggleHidePost(post.id, post.is_hidden)} className={`p-2 rounded-lg material-icons text-sm shadow-sm border transition-colors ${post.is_hidden ? 'bg-red-500 border-red-600 text-white' : 'bg-white border-[#1A1108]/10 text-red-500'}`}>
                                        {post.is_hidden ? 'visibility_off' : 'visibility'}
                                    </button>
                                </div>
                                {post.content && <p className="text-xs text-leather font-medium bg-neutral-50 p-2 rounded-lg border border-[#1A1108]/5">{post.content}</p>}
                                {post.media_url && <img src={post.media_url} className="w-full h-32 object-cover rounded-xl mt-1 opacity-80" alt="Post media" />}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="absolute inset-0 bg-[#F8F5F2] flex flex-col z-[120]">
                <SubHeader title="Propagandas & Social" />
                <div className="flex-1 overflow-y-auto pb-24">
                    <SectionTitle title="Gestão de Banners (Propaganda)" />
                    <div className="px-6 mb-6">
                        <form onSubmit={handleSaveBanner} className="bg-white p-6 rounded-[32px] border border-[#1A1108]/5 shadow-sm space-y-4 overflow-hidden relative">
                             <div className="relative aspect-[4/1] bg-neutral-50 rounded-2xl overflow-hidden border-2 border-dashed border-[#1A1108]/10 group">
                                {bannerForm.image_url ? (
                                    <>
                                        <img src={bannerForm.image_url} className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => setBannerForm({...bannerForm, image_url: ''})} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full material-icons text-sm shadow-xl">close</button>
                                    </>
                                ) : (
                                    <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-100 transition-colors">
                                        <span className="material-icons text-3xl text-[#D4AF37] mb-1">add_photo_alternate</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-leather/40">Banner (800x200 recomendado)</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleBannerFileUpload} />
                                    </label>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input className="w-full bg-neutral-50 border border-[#1A1108]/5 rounded-xl p-3 text-xs font-bold text-leather outline-none focus:border-[#D4AF37]" placeholder="Anunciante / Título" value={bannerForm.title || ''} onChange={(e)=>setBannerForm({...bannerForm, title: e.target.value})} required />
                                <input className="w-full bg-neutral-50 border border-[#1A1108]/5 rounded-xl p-3 text-xs font-bold text-leather outline-none focus:border-[#D4AF37]" placeholder="Link (Opcional)" value={bannerForm.link_url || ''} onChange={(e)=>setBannerForm({...bannerForm, link_url: e.target.value})} />
                            </div>
                            <button type="submit" disabled={loading} className="w-full bg-[#1A1108] text-white p-4 rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-xl">
                                 {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="material-icons text-sm">save</span>}
                                 {bannerForm.id ? "Atualizar Propaganda" : "Ativar Propaganda"}
                            </button>
                            {bannerForm.id && <button type="button" onClick={() => setBannerForm({})} className="w-full text-[9px] font-black uppercase tracking-widest text-[#D4AF37] mt-2">Cancelar Edição</button>}
                        </form>
                    </div>

                    <div className="px-6 space-y-3">
                        {bannersList.map((b) => (
                            <div key={b.id} className="bg-white border border-[#1A1108]/5 rounded-2xl p-3 flex items-center gap-4 shadow-sm group">
                                <div className="w-16 h-10 bg-neutral-100 rounded-lg overflow-hidden border border-[#1A1108]/5">
                                    <img src={b.image_url} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-tight text-leather truncate">{b.title}</p>
                                    <p className="text-[8px] font-bold text-[#D4AF37] truncate">{b.link_url || 'Sem link externo'}</p>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <button onClick={() => setBannerForm(b)} className="w-8 h-8 rounded-lg bg-neutral-50 text-leather/40 flex items-center justify-center hover:text-leather hover:bg-white transition-all">
                                        <span className="material-icons text-sm">edit</span>
                                    </button>
                                    <button onClick={() => deleteBanner(b.id)} className="w-8 h-8 rounded-lg bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                                        <span className="material-icons text-sm">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <SectionTitle title="Timeline Social" />
                    <div className="px-6">
                        <button onClick={() => setSubviewSocial('LIST')} className="w-full bg-white border border-[#1A1108]/10 text-leather p-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-between active:scale-95 shadow-sm group">
                            <div className="flex items-center gap-3">
                                <div className="bg-[#D4AF37]/10 w-10 h-10 rounded-lg flex items-center justify-center text-[#D4AF37]">
                                    <span className="material-icons">forum</span>
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-sm text-leather leading-tight">Moderar Timeline</p>
                                    <p className="text-[9px] text-leather/40 uppercase">Ocultar posts de usuários</p>
                                </div>
                            </div>
                            <span className="material-icons text-leather/20 group-hover:text-[#D4AF37] transition-colors">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderEventosView = () => {
        if (subviewEvents === 'CREATE') {
            return (
                <div className="absolute inset-0 bg-[#F8F5F2] flex flex-col z-[120]">
                    <header className="px-6 py-6 border-b border-[#1A1108]/5 flex items-center gap-4 bg-[#F8F5F2] sticky top-0 z-10 w-full">
                        <button onClick={() => setSubviewEvents('HOME')} className="material-icons text-leather active:scale-90 transition-transform">arrow_back</button>
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-leather">{eventForm.id ? "Editar Vaquejada" : "Nova Vaquejada"}</h2>
                    </header>
                    <div className="flex-1 overflow-y-auto p-6">
                        <form onSubmit={handleSaveEvent} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-leather/40 uppercase tracking-widest ml-1">Informações Básicas</label>
                                <input className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-4 text-sm text-leather focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Nome da Vaquejada" required value={eventForm.title || ''} onChange={(e)=>setEventForm({...eventForm, title: e.target.value})} />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <input className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-4 text-sm text-leather focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Parque" value={eventForm.park || ''} onChange={(e)=>setEventForm({...eventForm, park: e.target.value})} />
                                <input className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-4 text-sm text-leather focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Cidade / UF" value={eventForm.location || ''} onChange={(e)=>setEventForm({...eventForm, location: e.target.value})} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <input className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-4 text-sm text-leather focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Mês (ex: Set)" value={eventForm.date_month || ''} onChange={(e)=>setEventForm({...eventForm, date_month: e.target.value})} />
                                <input className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-4 text-sm text-leather focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Dia (ex: 15..17)" value={eventForm.date_day || ''} onChange={(e)=>setEventForm({...eventForm, date_day: e.target.value})} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-leather/40 uppercase tracking-widest ml-1">Imagem de Capa (Principal)</label>
                                <div className="relative aspect-video bg-white border-2 border-dashed border-[#1A1108]/10 rounded-2xl overflow-hidden group">
                                    {eventForm.image_url ? (
                                        <>
                                            <img src={eventForm.image_url} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                                <label className="bg-white text-leather p-2 rounded-full cursor-pointer active:scale-90 transition-transform shadow-lg">
                                                    <span className="material-icons text-xl">cached</span>
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'cover')} />
                                                </label>
                                                <button type="button" onClick={() => setEventForm({...eventForm, image_url: ''})} className="bg-red-500 text-white p-2 rounded-full active:scale-90 transition-transform shadow-lg">
                                                    <span className="material-icons text-xl">delete</span>
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-50 transition-colors">
                                            <span className="material-icons text-4xl text-[#D4AF37] mb-2">add_photo_alternate</span>
                                            <span className="text-[10px] font-black text-leather/40 uppercase tracking-widest">Toque para Upload</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'cover')} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-leather/40 uppercase tracking-widest ml-1 flex justify-between items-center">
                                    Galeria do Evento
                                    <span className="text-[8px] opacity-60">Até 4 fotos extras</span>
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[0, 1, 2, 3].map((idx) => {
                                        const imgUrl = (eventForm.gallery || [])[idx];
                                        return (
                                            <div key={idx} className="aspect-square bg-white border border-[#1A1108]/10 rounded-xl overflow-hidden relative group">
                                                {imgUrl ? (
                                                    <>
                                                        <img src={imgUrl} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <button 
                                                                type="button" 
                                                                onClick={() => {
                                                                    const newGal = [...(eventForm.gallery || [])];
                                                                    newGal[idx] = '';
                                                                    setEventForm({...eventForm, gallery: newGal});
                                                                }}
                                                                className="text-white material-icons text-sm"
                                                            >delete</button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <label className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-neutral-50">
                                                        <span className="material-icons text-leather/20">add</span>
                                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, idx)} />
                                                    </label>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-leather/40 uppercase tracking-widest ml-1">Detalhes</label>
                                <input className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-4 text-sm text-leather focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Premiação (ex: R$ 50.000)" value={eventForm.prizes || ''} onChange={(e)=>setEventForm({...eventForm, prizes: e.target.value})} />
                                <textarea className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-4 text-sm text-leather focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Descrição opcional..." rows={4} value={eventForm.description || ''} onChange={(e)=>setEventForm({...eventForm, description: e.target.value})} />
                            </div>

                            <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-[#1A1108]/5 shadow-sm">
                                <input type="checkbox" id="hl_event" checked={eventForm.is_highlight || false} onChange={(e)=>setEventForm({...eventForm, is_highlight: e.target.checked})} className="w-6 h-6 accent-[#D4AF37] cursor-pointer" />
                                <label htmlFor="hl_event" className="text-xs font-black text-leather block cursor-pointer select-none uppercase tracking-tight">Destacar no topo do App</label>
                            </div>

                            <div className="pt-4 pb-10 space-y-3">
                                <button type="submit" disabled={loading} className="w-full bg-[#D4AF37] text-white p-5 rounded-2xl font-black uppercase text-xs active:scale-95 transition-transform shadow-xl shadow-[#D4AF37]/20 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="material-icons text-sm">save</span>}
                                    {eventForm.id ? "Atualizar Vaquejada" : "Salvar Vaquejada"}
                                </button>
                                <button type="button" onClick={()=>setSubviewEvents('HOME')} className="w-full bg-transparent text-leather/40 p-3 rounded-xl font-black uppercase text-[10px] tracking-widest">Descartar Alterações</button>
                            </div>
                        </form>
                    </div>
                </div>
            );
        }

        if (subviewEvents === 'LIST') {
            return (
                <div className="absolute inset-0 bg-[#F8F5F2] flex flex-col z-[120]">
                    <header className="px-6 py-6 border-b border-[#1A1108]/5 flex items-center gap-4 bg-[#F8F5F2] sticky top-0 z-10 w-full">
                        <button onClick={() => setSubviewEvents('HOME')} className="material-icons text-leather active:scale-90 transition-transform">arrow_back</button>
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-leather">Lista de Eventos</h2>
                    </header>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {eventsList.length === 0 ? <p className="text-center text-xs opacity-50 py-10 font-bold uppercase tracking-widest">Nenhum evento registrado.</p> : eventsList.map((ev) => (
                            <div key={ev.id} className={`bg-white border rounded-xl p-4 flex justify-between items-center ${ev.is_paused ? 'border-red-300 opacity-50' : 'border-[#1A1108]/10'}`}>
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm">{ev.title}</h4>
                                    <p className="text-[10px] text-leather/60 font-medium">{ev.date_day} {ev.date_month} • {ev.park}</p>
                                    {ev.is_paused && <span className="text-[9px] bg-red-100 text-red-600 px-1 py-0.5 rounded font-black inline-block mt-1">OCULTADO</span>}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setEventForm(ev); setSubviewEvents('CREATE'); }} className="material-icons text-leather/60 text-[20px] p-1">edit</button>
                                    <button onClick={() => toggleHideEvent(ev.id, ev.is_paused)} className={`material-icons text-[20px] p-1 ${ev.is_paused ? 'text-green-600' : 'text-red-500'}`}>
                                        {ev.is_paused ? 'visibility' : 'visibility_off'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="absolute inset-0 bg-[#F8F5F2] flex flex-col z-[120]">
                <SubHeader title="Vaquejadas" />
                <div className="flex-1 overflow-y-auto pb-10">
                    <SectionTitle title="Gestão de Eventos" />
                    <div className="px-6 grid grid-cols-2 gap-3 mb-6">
                        <button onClick={()=>{ setEventForm({}); setSubviewEvents('CREATE'); }} className="bg-[#D4AF37] text-white p-4 rounded-xl font-black uppercase tracking-widest text-[10px] flex flex-col items-center gap-2 active:scale-95 shadow-sm">
                            <span className="material-icons">add_box</span>
                            Nova Vaquejada
                        </button>
                    </div>

                    <SectionTitle title="Eventos Atuais" />
                    <div className="px-6 space-y-4">
                        {eventsList.length === 0 ? (
                            <div className="bg-white/50 border border-leather/5 p-10 rounded-2xl flex flex-col items-center gap-2 opacity-40">
                                <span className="material-icons text-4xl">event_busy</span>
                                <p className="text-[10px] font-black uppercase tracking-widest">Nenhum evento registrado</p>
                            </div>
                        ) : (
                            eventsList.map((ev) => (
                                <div key={ev.id} className={`bg-white border rounded-2xl p-4 flex justify-between items-center shadow-sm transition-all ${ev.is_paused ? 'border-red-300 opacity-60 bg-red-50/20' : 'border-[#1A1108]/5'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-neutral-100 rounded-xl overflow-hidden border border-[#1A1108]/5">
                                            <img src={ev.image_url} className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-sm text-leather leading-tight uppercase tracking-tight">{ev.title}</h4>
                                            <p className="text-[9px] text-leather/40 font-bold uppercase">{ev.date_day} {ev.date_month} • {ev.park}</p>
                                            {ev.is_paused && <span className="text-[7px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-black inline-block mt-1 uppercase tracking-tighter">Oculto</span>}
                                            {ev.is_highlight && <span className="text-[7px] bg-[#D4AF37] text-white px-1.5 py-0.5 rounded-full font-black inline-block mt-1 ml-1 uppercase tracking-tighter">Destaque</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEventForm(ev); setSubviewEvents('CREATE'); }} className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center active:scale-90 transition-transform">
                                            <span className="material-icons text-sm">edit</span>
                                        </button>
                                        <button onClick={() => toggleHideEvent(ev.id, ev.is_paused)} className={`w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-transform ${ev.is_paused ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-500'}`}>
                                            <span className="material-icons text-sm">{ev.is_paused ? 'visibility' : 'visibility_off'}</span>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderNoticiasView = () => {
        if (subviewNews === 'CREATE') {
            return (
                <div className="absolute inset-0 bg-[#F8F5F2] flex flex-col z-[120]">
                    <header className="px-6 py-6 border-b border-[#1A1108]/5 flex items-center gap-4 bg-[#F8F5F2] sticky top-0 z-10 w-full">
                        <button onClick={() => setSubviewNews('HOME')} className="material-icons text-leather active:scale-90 transition-transform">arrow_back</button>
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-leather">{newsForm.id ? "Editar Notícia" : "Criar Notícia"}</h2>
                    </header>
                    <div className="flex-1 overflow-y-auto p-6">
                        <form onSubmit={handleSaveNews} className="space-y-4 pb-20">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-leather/40 uppercase tracking-widest ml-1">Cabeçalho</label>
                                <input className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-4 text-sm text-leather focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Título da Notícia" required value={newsForm.title || ''} onChange={(e)=>setNewsForm({...newsForm, title: e.target.value})} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <input className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-4 text-sm text-leather focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Tag Curta (Ex: RESULTADOS)" value={newsForm.tag || ''} onChange={(e)=>setNewsForm({...newsForm, tag: e.target.value})} />
                                <input className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-4 text-sm text-leather focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Data (Ex: Ontem)" value={newsForm.date || ''} onChange={(e)=>setNewsForm({...newsForm, date: e.target.value})} />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-leather/40 uppercase tracking-widest ml-1">Tipo de Conteúdo</label>
                                <select className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-4 text-sm text-leather focus:border-[#D4AF37] outline-none shadow-sm appearance-none" value={newsForm.type || 'info'} onChange={(e)=>setNewsForm({...newsForm, type: e.target.value})}>
                                    <option value="info">Geral / Informativo</option>
                                    <option value="important">Urgente / Alerta</option>
                                    <option value="success">Resultado / Festa</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-leather/40 uppercase tracking-widest ml-1">Foto da Notícia</label>
                                <div className="relative aspect-video bg-white border-2 border-dashed border-[#1A1108]/10 rounded-2xl overflow-hidden group">
                                    {newsForm.image_url ? (
                                        <>
                                            <img src={newsForm.image_url} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                                <label className="bg-white text-leather p-2 rounded-full cursor-pointer shadow-lg active:scale-90 transition-transform">
                                                    <span className="material-icons text-xl">cached</span>
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleNewsFileUpload(e, 'image')} />
                                                </label>
                                                <button type="button" onClick={() => setNewsForm({...newsForm, image_url: ''})} className="bg-red-500 text-white p-2 rounded-full shadow-lg active:scale-90 transition-transform">
                                                    <span className="material-icons text-xl">delete</span>
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-50 transition-colors">
                                            <span className="material-icons text-4xl text-[#D4AF37] mb-2">add_photo_alternate</span>
                                            <span className="text-[10px] font-black text-leather/40 uppercase tracking-widest">Adicionar Foto</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleNewsFileUpload(e, 'image')} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-leather/40 uppercase tracking-widest ml-1">Anexo PDF</label>
                                    <label className={`w-full h-14 border rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${newsForm.pdf_url ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-[#1A1108]/10 text-leather/40'}`}>
                                        <span className="material-icons text-xl">{newsForm.pdf_url ? 'picture_as_pdf' : 'attach_file'}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">{newsForm.pdf_url ? 'PDF Pronto' : 'Subir PDF'}</span>
                                        <input type="file" className="hidden" accept="application/pdf" onChange={(e) => handleNewsFileUpload(e, 'pdf')} />
                                        {newsForm.pdf_url && (
                                            <button type="button" onClick={(e) => { e.preventDefault(); setNewsForm({...newsForm, pdf_url: ''}); }} className="ml-2 material-icons text-sm opacity-50 hover:opacity-100">close</button>
                                        )}
                                    </label>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-leather/40 uppercase tracking-widest ml-1">Link Externo</label>
                                    <div className="relative">
                                        <input className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-4 pl-10 text-sm text-leather focus:border-[#D4AF37] outline-none shadow-sm" placeholder="https://..." value={newsForm.external_link || ''} onChange={(e)=>setNewsForm({...newsForm, external_link: e.target.value})} />
                                        <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-leather/20 text-lg">link</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-leather/40 uppercase tracking-widest ml-1">Texto da Notícia</label>
                                <textarea className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-4 text-sm text-leather focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Descrição completa..." rows={6} value={newsForm.description || ''} onChange={(e)=>setNewsForm({...newsForm, description: e.target.value})} />
                            </div>

                            <button type="submit" disabled={loading} className="w-full bg-[#D4AF37] text-white p-5 rounded-2xl font-black uppercase text-xs active:scale-95 transition-transform shadow-xl shadow-[#D4AF37]/20 flex items-center justify-center gap-2 disabled:opacity-50 mt-4">
                                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="material-icons text-sm">publish</span>}
                                {newsForm.id ? "Atualizar Notícia" : "Publicar Notícia"}
                            </button>
                            <button type="button" onClick={()=>setSubviewNews('HOME')} className="w-full bg-transparent text-leather/40 p-3 rounded-xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                        </form>
                    </div>
                </div>
            );
        }

        if (subviewNews === 'LIST') {
            return (
                <div className="absolute inset-0 bg-[#F8F5F2] flex flex-col z-[120]">
                    <header className="px-6 py-6 border-b border-[#1A1108]/5 flex items-center gap-4 bg-[#F8F5F2] sticky top-0 z-10 w-full">
                        <button onClick={() => setSubviewNews('HOME')} className="material-icons text-leather active:scale-90 transition-transform">arrow_back</button>
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-leather">Lista de Notícias</h2>
                    </header>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {newsList.length === 0 ? <p className="text-center text-xs opacity-50 py-10 font-bold uppercase tracking-widest">Nenhuma notícia registrada.</p> : newsList.map((nw) => (
                            <div key={nw.id} className={`bg-white border rounded-xl p-4 flex justify-between items-center ${nw.is_paused ? 'border-red-300 opacity-50' : 'border-[#1A1108]/10'}`}>
                                <div className="flex-1 pr-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${nw.type === 'urgent' ? 'bg-red-50 text-red-600' : nw.type === 'official' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-neutral-100 text-neutral-500'}`}>{nw.tag}</span>
                                        <span className="text-[10px] font-medium text-leather/60">{nw.date}</span>
                                    </div>
                                    <h4 className="font-bold text-sm leading-tight text-leather">{nw.title}</h4>
                                    {nw.is_paused && <span className="text-[9px] bg-red-100 text-red-600 px-1 py-0.5 rounded font-black inline-block mt-1">OCULTADA</span>}
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button onClick={() => { setNewsForm(nw); setSubviewNews('CREATE'); }} className="material-icons text-leather/60 text-[20px] p-1">edit</button>
                                    <button onClick={() => toggleHideNews(nw.id, nw.is_paused)} className={`material-icons text-[20px] p-1 ${nw.is_paused ? 'text-green-600' : 'text-red-500'}`}>
                                        {nw.is_paused ? 'visibility' : 'visibility_off'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="absolute inset-0 bg-[#F8F5F2] flex flex-col z-[120]">
                <SubHeader title="Arena Notícias" />
                <div className="flex-1 overflow-y-auto">
                    <SectionTitle title="Gestão de Notícias" />
                    <div className="px-6 grid grid-cols-2 gap-3 mb-6">
                        <button onClick={()=>{ setNewsForm({ type: 'info' }); setSubviewNews('CREATE'); }} className="bg-[#D4AF37] text-white p-4 rounded-xl font-black uppercase tracking-widest text-[10px] flex flex-col items-center gap-2 active:scale-95 shadow-sm">
                            <span className="material-icons">post_add</span>
                            Criar Notícia
                        </button>
                        <button onClick={()=>{ setSubviewNews('LIST'); }} className="bg-white border border-[#1A1108]/10 text-leather p-4 rounded-xl font-black uppercase tracking-widest text-[10px] flex flex-col items-center gap-2 active:scale-95">
                            <span className="material-icons">newspaper</span>
                            Editar/Ocultar
                        </button>
                    </div>
                </div>
            </div>
        );
    };


    // --- MAIN RENDER ---
    
    if (activeTab === 'USERS') return renderUsersView();
    if (activeTab === 'MERCADO') return renderMercadoView();
    if (activeTab === 'SOCIAL') return renderSocialView();
    if (activeTab === 'EVENTOS') return renderEventosView();
    if (activeTab === 'NOTICIAS') return renderNoticiasView();

    return (
        <div className="min-h-full bg-[#F8F5F2] text-leather font-sans pb-24 font-display animate-in slide-in-from-right duration-300 z-[150] relative">
            <header className="px-6 py-6 border-b border-[#1A1108]/5 flex items-center gap-4 bg-white sticky top-0 z-10 w-full shadow-sm">
                <button onClick={() => window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view: View.SETTINGS } }))} className="material-icons text-leather active:scale-90">arrow_back</button>
                <div className="flex-1 text-center pr-8">
                    <h2 className="text-xl font-black uppercase italic tracking-tight text-[#D4AF37]">ADM Geral</h2>
                    <p className="text-[10px] font-black tracking-widest uppercase text-leather/40">Painel Operacional</p>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto">
                <div className="p-6 pb-2 m-4 bg-[#D4AF37]/5 rounded-2xl border border-[#D4AF37]/20 flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-[#D4AF37]/20 rounded-full flex items-center justify-center shrink-0">
                        <span className="material-icons text-[#D4AF37]">shield</span>
                    </div>
                    <div>
                        <h4 className="font-black text-sm uppercase tracking-wide">Conta Administrativa</h4>
                        <p className="text-[10px] font-medium leading-tight text-leather/60 mt-0.5">
                            {isMaster ? 'Acesso Global Ilimitado autorizado.' : 'Acesso Modular autorizado pelo Mestre.'}
                        </p>
                    </div>
                </div>

                {isMaster && (
                    <>
                        <SectionTitle title="Superusuário" />
                        <MenuItem 
                            icon="group" 
                            label="Comunidade & Usuários" 
                            badge={totalUsersCount ? totalUsersCount.toLocaleString() : undefined} 
                            onClick={() => setActiveTab('USERS')} 
                        />
                    </>
                )}

                {(hasMercado || hasSocial || hasEventos || hasNoticias) && <SectionTitle title="Módulos Interligados" />}
                
                {hasMercado && <MenuItem icon="storefront" label="Mercado Oficial" onClick={() => setActiveTab('MERCADO')} />}
                
                {hasSocial && <MenuItem icon="pets" label="+Vaquejada" onClick={() => setActiveTab('SOCIAL')} />}
                
                {hasEventos && <MenuItem icon="emoji_events" label="Vaquejadas" onClick={() => setActiveTab('EVENTOS')} />}
                
                {hasNoticias && <MenuItem icon="campaign" label="Arena Notícias" onClick={() => setActiveTab('NOTICIAS')} />}
                
                <div className="py-20 opacity-20 flex flex-col items-center">
                    <span className="material-icons text-4xl mb-2">admin_panel_settings</span>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Sistema Restrito</p>
                </div>
            </div>

            {loading && (
                <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-[300]">
                    <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
};

export default AdminView;
