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

    const [eventForm, setEventForm] = useState<any>({});
    const [newsForm, setNewsForm] = useState<any>({ type: 'info' });

    const isMaster = user?.isMaster || false;
    const hasMercado = isMaster || user?.admin_mercado;
    const hasSocial = isMaster || user?.admin_social;
    const hasEventos = isMaster || user?.admin_eventos;
    const hasNoticias = isMaster || user?.admin_noticias;

    useEffect(() => {
        if (isMaster) fetchTotalUsers();
        if (hasEventos && subviewEvents === 'LIST') fetchEvents();
        if (hasNoticias && subviewNews === 'LIST') fetchNews();
        if (hasMercado && subviewMercado === 'LIST') fetchMarket();
        if (hasSocial && subviewSocial === 'LIST') fetchPosts();
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

    const handleSaveEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...eventForm, created_by: user.id };
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
        if (query.length < 3) {
            setSearchResults([]);
            return;
        }

        const { data } = await supabase
            .from('profiles')
            .select('*')
            .or(`name.ilike.%${query}%,full_name.ilike.%${query}%,email.ilike.%${query}%,username.ilike.%${query}%`)
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
            alert(`Permissão ${column} atualizada com sucesso!`);
            // Update local state results
            setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, [column]: !currentValue } : u));
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

    const PermissionManager = ({ columnLabel, columnKey }: { columnLabel: string, columnKey: string }) => (
        <div className="p-6">
            <h4 className="text-xs font-black text-leather uppercase tracking-widest mb-2">Promover Administradores</h4>
            <p className="text-[10px] text-leather/60 mb-4">Busque usuários e conceda a eles permissão de gestão apenas na aba "{columnLabel}".</p>
            
            <input 
                type="text" 
                placeholder="Buscar por @username, nome ou email..."
                className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-3 text-sm text-leather mb-4 outline-none focus:border-[#D4AF37]"
                value={searchQuery}
                onChange={(e) => searchUsers(e.target.value)}
            />

            {searchResults.length > 0 && (
                <div className="space-y-2 mt-4">
                    {searchResults.map(result => (
                        <div key={result.id} className="bg-white border border-[#1A1108]/5 p-3 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <img src={result.avatar_url || `https://ui-avatars.com/api/?name=${result.name || result.username}`} className="w-10 h-10 rounded-full" />
                                <div>
                                    <p className="font-bold text-sm text-leather">{result.name || result.full_name}</p>
                                    <p className="text-[10px] text-leather/60 uppercase">@{result.username}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => toggleSubAdminPermission(result.id, columnKey, result[columnKey] || false)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${
                                    result[columnKey] 
                                    ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100' 
                                    : 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#D4AF37]/20'
                                }`}
                            >
                                {result[columnKey] ? 'Remover Admin' : 'Promover'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // --- SPECIFIC VIEWS ---

    const renderUsersView = () => (
        <div className="absolute inset-0 bg-[#F8F5F2] flex flex-col z-[120]">
            <SubHeader title="Base de Usuários" />
            <div className="flex-1 overflow-y-auto">
                <SectionTitle title="Geral" />
                <div className="px-6 py-4 flex gap-4 bg-white/50 border-y border-[#1A1108]/5">
                    <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-full flex items-center justify-center">
                        <span className="material-icons text-[#D4AF37]">group</span>
                    </div>
                    <div>
                        <p className="text-xl font-black text-leather">{totalUsersCount}</p>
                        <p className="text-[10px] text-leather/40 uppercase font-black tracking-widest">Contas Registradas</p>
                    </div>
                </div>

                <div className="p-6 mt-4">
                    <h3 className="text-xs font-black text-leather uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="material-icons text-red-500 text-[16px]">warning</span>
                        Excluir Conta Manualmente
                    </h3>
                    <input 
                        type="text" 
                        placeholder="Buscar por @username, nome ou email..."
                        className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-3 text-sm text-leather mb-4 outline-none focus:border-red-500/50"
                        value={searchQuery}
                        onChange={(e) => searchUsers(e.target.value)}
                    />
                    {searchResults.map(result => (
                        <div key={result.id} className="bg-white border border-red-500/20 p-3 rounded-xl flex items-center justify-between mb-2">
                            <div>
                                <p className="font-bold text-sm text-leather">{result.name || result.full_name}</p>
                                <p className="text-[10px] text-leather/60">@{result.username}</p>
                            </div>
                            <button 
                                onClick={() => deleteUser(result.id, result.name || result.username)}
                                className="px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95"
                            >
                                Deletar
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

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
                    {isMaster && (
                        <>
                            <SectionTitle title="Hierarquia" />
                            <PermissionManager columnLabel="Mercado" columnKey="admin_mercado" />
                        </>
                    )}
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
                    <header className="px-6 py-6 border-b border-[#1A1108]/5 flex items-center gap-4 bg-[#F8F5F2] sticky top-0 z-10 w-full">
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
                                        <p className="text-[9px] text-leather/40">ID do Post: {post.id.split('-')[0]}</p>
                                    </div>
                                    <button onClick={() => toggleHidePost(post.id, post.is_hidden)} className={`p-2 rounded-lg material-icons text-sm shadow-sm border transition-colors ${post.is_hidden ? 'bg-red-500 border-red-600 text-white' : 'bg-white border-[#1A1108]/10 text-red-500'}`}>
                                        {post.is_hidden ? 'delete_forever' : 'delete'}
                                    </button>
                                </div>
                                {post.content && <p className="text-xs text-leather font-medium bg-neutral-50 p-2 rounded-lg border border-[#1A1108]/5">{post.content}</p>}
                                {post.media_url && <img src={post.media_url} className="w-full h-32 object-cover rounded-xl mt-1 opacity-80" alt="Post media" />}
                                {post.is_hidden && <p className="text-[9px] text-red-600 font-black tracking-widest text-center uppercase border-t border-red-500/20 pt-2 mt-1">Post censurado da timeline principal</p>}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="absolute inset-0 bg-[#F8F5F2] flex flex-col z-[120]">
                <SubHeader title="+Vaquejada" />
                <div className="flex-1 overflow-y-auto">
                    {isMaster && (
                        <>
                            <SectionTitle title="Hierarquia" />
                            <PermissionManager columnLabel="+Vaquejada" columnKey="admin_social" />
                        </>
                    )}
                    <SectionTitle title="Controle Social" />
                    <div className="px-6 mb-6">
                        <button onClick={() => setSubviewSocial('LIST')} className="w-full bg-white border border-[#1A1108]/10 text-leather p-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-between active:scale-95 shadow-sm group">
                            <div className="flex items-center gap-3">
                                <div className="bg-red-500/10 w-10 h-10 rounded-lg flex items-center justify-center">
                                    <span className="material-icons text-red-500">warning</span>
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-sm text-leather">Moderar Timeline</p>
                                    <p className="text-[9px] text-leather/40 uppercase">Ocultar posts de usuários</p>
                                </div>
                            </div>
                            <span className="material-icons text-leather/20 group-hover:text-red-500 transition-colors">chevron_right</span>
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
                            <input className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-3 text-sm text-leather focus:border-[#D4AF37] outline-none" placeholder="Nome da Vaquejada" required value={eventForm.title || ''} onChange={(e)=>setEventForm({...eventForm, title: e.target.value})} />
                            <input className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-3 text-sm text-leather focus:border-[#D4AF37] outline-none" placeholder="Parque" value={eventForm.park || ''} onChange={(e)=>setEventForm({...eventForm, park: e.target.value})} />
                            <input className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-3 text-sm text-leather focus:border-[#D4AF37] outline-none" placeholder="Cidade / UF" value={eventForm.location || ''} onChange={(e)=>setEventForm({...eventForm, location: e.target.value})} />
                             <div className="grid grid-cols-2 gap-3">
                                <input className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-3 text-sm text-leather focus:border-[#D4AF37] outline-none" placeholder="Mês (ex: Set)" value={eventForm.date_month || ''} onChange={(e)=>setEventForm({...eventForm, date_month: e.target.value})} />
                                <input className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-3 text-sm text-leather focus:border-[#D4AF37] outline-none" placeholder="Dia (ex: 15..17)" value={eventForm.date_day || ''} onChange={(e)=>setEventForm({...eventForm, date_day: e.target.value})} />
                            </div>
                            <input className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-3 text-sm text-leather focus:border-[#D4AF37] outline-none" placeholder="URL da Imagem de Capa" required value={eventForm.image_url || ''} onChange={(e)=>setEventForm({...eventForm, image_url: e.target.value})} />
                            <input className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-3 text-sm text-leather focus:border-[#D4AF37] outline-none" placeholder="Premiação (ex: R$ 50.000)" value={eventForm.prizes || ''} onChange={(e)=>setEventForm({...eventForm, prizes: e.target.value})} />
                            <textarea className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-3 text-sm text-leather focus:border-[#D4AF37] outline-none" placeholder="Descrição opcional..." rows={3} value={eventForm.description || ''} onChange={(e)=>setEventForm({...eventForm, description: e.target.value})} />
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="hl_event" checked={eventForm.is_highlight || false} onChange={(e)=>setEventForm({...eventForm, is_highlight: e.target.checked})} className="w-5 h-5 accent-[#D4AF37] bg-white border-[#1A1108]/10 rounded" />
                                <label htmlFor="hl_event" className="text-xs font-bold text-leather block cursor-pointer select-none">Destacar no Carrossel Inicial</label>
                            </div>
                            <button type="submit" className="w-full bg-[#D4AF37] text-white p-4 rounded-xl font-black uppercase text-xs mt-4 active:scale-95 transition-transform">Salvar Vaquejada</button>
                            <button type="button" onClick={()=>setSubviewEvents('HOME')} className="w-full bg-transparent text-leather p-4 rounded-xl font-bold uppercase text-xs">Cancelar</button>
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
                <div className="flex-1 overflow-y-auto">
                    {isMaster && (
                        <>
                            <SectionTitle title="Hierarquia" />
                            <PermissionManager columnLabel="Vaquejadas" columnKey="admin_eventos" />
                        </>
                    )}
                    <SectionTitle title="Gestão de Eventos" />
                    <div className="px-6 grid grid-cols-2 gap-3 mb-6">
                        <button onClick={()=>{ setEventForm({}); setSubviewEvents('CREATE'); }} className="bg-[#D4AF37] text-white p-4 rounded-xl font-black uppercase tracking-widest text-[10px] flex flex-col items-center gap-2 active:scale-95 shadow-sm">
                            <span className="material-icons">add_box</span>
                            Nova Vaquejada
                        </button>
                        <button onClick={()=>{ setSubviewEvents('LIST'); }} className="bg-white border border-[#1A1108]/10 text-leather p-4 rounded-xl font-black uppercase tracking-widest text-[10px] flex flex-col items-center gap-2 active:scale-95">
                            <span className="material-icons">list_alt</span>
                            Lista/Ocultar
                        </button>
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
                        <form onSubmit={handleSaveNews} className="space-y-4">
                            <input className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-3 text-sm text-leather focus:border-[#D4AF37] outline-none" placeholder="Título da Notícia" required value={newsForm.title || ''} onChange={(e)=>setNewsForm({...newsForm, title: e.target.value})} />
                            <input className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-3 text-sm text-leather focus:border-[#D4AF37] outline-none" placeholder="Tag Curta (Ex: RESULTADOS, URGENTE)" required value={newsForm.tag || ''} onChange={(e)=>setNewsForm({...newsForm, tag: e.target.value})} />
                            <input className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-3 text-sm text-leather focus:border-[#D4AF37] outline-none" placeholder="Data (Ex: Ontem, 12 de Jan)" required value={newsForm.date || ''} onChange={(e)=>setNewsForm({...newsForm, date: e.target.value})} />
                            <select className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-3 text-sm text-leather focus:border-[#D4AF37] outline-none" value={newsForm.type || 'info'} onChange={(e)=>setNewsForm({...newsForm, type: e.target.value})}>
                                <option value="info">Geral / Informativo</option>
                                <option value="urgent">Urgente (Destaque Vermelho)</option>
                                <option value="official">Oficial (Destaque Dourado)</option>
                            </select>
                            <textarea className="w-full bg-white border border-[#1A1108]/10 rounded-xl p-3 text-sm text-leather focus:border-[#D4AF37] outline-none" placeholder="Descrição completa..." rows={5} value={newsForm.description || ''} onChange={(e)=>setNewsForm({...newsForm, description: e.target.value})} />
                            
                            <button type="submit" className="w-full bg-[#D4AF37] text-white p-4 rounded-xl font-black uppercase text-xs mt-4 active:scale-95 transition-transform">Salvar Notícia</button>
                            <button type="button" onClick={()=>setSubviewNews('HOME')} className="w-full bg-transparent text-leather p-4 rounded-xl font-bold uppercase text-xs">Cancelar</button>
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
                    {isMaster && (
                        <>
                            <SectionTitle title="Hierarquia" />
                            <PermissionManager columnLabel="Arena Notícias" columnKey="admin_noticias" />
                        </>
                    )}
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
