import React, { useState, useEffect } from 'react';
import { User, View } from '../types';
import { supabase } from '../lib/supabase';
import AdminAdsManager from '../components/AdminAdsManager';
import AdminMasterView from '../components/AdminMasterView';
import { DateRangePicker } from '../components/DateRangePicker';
import { compressImage } from '../lib/imageUtils';


// Extrai o ID do vídeo YouTube de uma URL
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

interface AdminViewProps {
    user: any;
}

type AdminTab = 'MAIN' | 'USERS' | 'MERCADO' | 'SOCIAL' | 'EVENTOS' | 'NOTICIAS' | 'RESULTADOS' | 'ADS' | 'MASTER';


const AdminView: React.FC<AdminViewProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>(() => (localStorage.getItem('arena_admin_active_tab') as AdminTab) || 'MAIN');
    const [loadingTasks, setLoadingTasks] = useState(0);
    const loading = loadingTasks > 0;
    const setLoading = (isLoading: boolean) => {
        setLoadingTasks(prev => isLoading ? prev + 1 : Math.max(0, prev - 1));
    };
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [success, setSuccess] = useState<string | null>(null);
    const [showFullUserList, setShowFullUserList] = useState(false);
    const [userListSort, setUserListSort] = useState<'name' | 'newest'>('newest');
    
    // Stats for Main Menu
    const [totalUsersCount, setTotalUsersCount] = useState(0);

    // View States for Events and News
    const [subviewEvents, setSubviewEvents] = useState<'HOME'|'CREATE'|'LIST'>(() => (localStorage.getItem('arena_admin_sub_events') as any) || 'HOME');
    const [subviewNews, setSubviewNews] = useState<'HOME'|'CREATE'|'LIST'|'TV'>(() => (localStorage.getItem('arena_admin_sub_news') as any) || 'HOME');
    const [subviewMercado, setSubviewMercado] = useState<'HOME'|'LIST'|'STORES'>(() => (localStorage.getItem('arena_admin_sub_mercado') as any) || 'HOME');
    const [subviewSocial, setSubviewSocial] = useState<'HOME'|'LIST'>(() => (localStorage.getItem('arena_admin_sub_social') as any) || 'HOME');
    const [subviewResults, setSubviewResults] = useState<'HOME'|'CREATE'|'LIST'>(() => (localStorage.getItem('arena_admin_sub_results') as any) || 'HOME');

    useEffect(() => {
        localStorage.setItem('arena_admin_active_tab', activeTab);
        localStorage.setItem('arena_admin_sub_events', subviewEvents);
        localStorage.setItem('arena_admin_sub_news', subviewNews);
        localStorage.setItem('arena_admin_sub_mercado', subviewMercado);
        localStorage.setItem('arena_admin_sub_social', subviewSocial);
        localStorage.setItem('arena_admin_sub_results', subviewResults);
    }, [activeTab, subviewEvents, subviewNews, subviewMercado, subviewSocial, subviewResults]);

    const [eventsList, setEventsList] = useState<any[]>([]);
    const [newsList, setNewsList] = useState<any[]>([]);
    const [transmissionsList, setTransmissionsList] = useState<any[]>([]);
    const [marketList, setMarketList] = useState<any[]>([]);
    const [storesList, setStoresList] = useState<any[]>([]);
    const [postsList, setPostsList] = useState<any[]>([]);
    const [bannersList, setBannersList] = useState<any[]>([]);
    const [resultsList, setResultsList] = useState<any[]>([]);
    const [resultCategories, setResultCategories] = useState<any[]>(() => {
        try { const saved = localStorage.getItem('arena_admin_result_cats'); return saved ? JSON.parse(saved) : []; } catch { return []; }
    });
    const [resultLines, setResultLines] = useState<any[]>(() => {
        try { const saved = localStorage.getItem('arena_admin_result_lines'); return saved ? JSON.parse(saved) : []; } catch { return []; }
    });

    const [eventForm, setEventForm] = useState<any>(() => {
        try { const saved = localStorage.getItem('arena_admin_event_form'); return saved ? JSON.parse(saved) : {}; } catch { return {}; }
    });
    const [newsForm, setNewsForm] = useState<any>(() => {
        try { const saved = localStorage.getItem('arena_admin_news_form'); return saved ? JSON.parse(saved) : { type: 'info' }; } catch { return { type: 'info' }; }
    });
    const [transmissionForm, setTransmissionForm] = useState<any>(() => {
        try { const saved = localStorage.getItem('arena_admin_transm_form'); return saved ? JSON.parse(saved) : {}; } catch { return {}; }
    });
    const [bannerForm, setBannerForm] = useState<any>(() => {
        try { const saved = localStorage.getItem('arena_admin_banner_form'); return saved ? JSON.parse(saved) : {}; } catch { return {}; }
    });
    const [resultForm, setResultForm] = useState<any>(() => {
        try { const saved = localStorage.getItem('arena_admin_result_form'); return saved ? JSON.parse(saved) : { status: 'rascunho' }; } catch { return { status: 'rascunho' }; }
    });

    const [resultUserSuggestions, setResultUserSuggestions] = useState<any[]>([]);
    const [activeResultLineIdx, setActiveResultLineIdx] = useState<number | null>(null);

    useEffect(() => {
        localStorage.setItem('arena_admin_result_cats', JSON.stringify(resultCategories));
        localStorage.setItem('arena_admin_result_lines', JSON.stringify(resultLines));
        localStorage.setItem('arena_admin_event_form', JSON.stringify(eventForm));
        localStorage.setItem('arena_admin_news_form', JSON.stringify(newsForm));
        localStorage.setItem('arena_admin_transm_form', JSON.stringify(transmissionForm));
        localStorage.setItem('arena_admin_banner_form', JSON.stringify(bannerForm));
        localStorage.setItem('arena_admin_result_form', JSON.stringify(resultForm));
    }, [resultCategories, resultLines, eventForm, newsForm, transmissionForm, bannerForm, resultForm]);

    // Auto-save form data to prevent loss on multitasking
    const [storeForm, setStoreForm] = useState<any>(() => {
        try {
            const saved = localStorage.getItem('arena_admin_store_form');
            return saved ? JSON.parse(saved) : { is_official: true };
        } catch {
            return { is_official: true };
        }
    });

    useEffect(() => {
        localStorage.setItem('arena_admin_store_form', JSON.stringify(storeForm));
    }, [storeForm]);

    const [managerSuggestions, setManagerSuggestions] = useState<any[]>([]);
    const [showManagerSuggestions, setShowManagerSuggestions] = useState(false);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!storeForm.user_id || storeForm.user_id.length < 2) {
                setManagerSuggestions([]);
                setShowManagerSuggestions(false);
                return;
            }
            const query = storeForm.user_id.replace('@', '').toLowerCase();
            const { data } = await supabase
                .from('profiles')
                .select('id, username, name, avatar_url')
                .ilike('username', `%${query}%`)
                .limit(5);
            
            if (data && data.length > 0) {
                // don't show if it's an exact match already chosen
                if (data.length === 1 && `@${data[0].username}` === storeForm.user_id) {
                    setShowManagerSuggestions(false);
                } else {
                    setManagerSuggestions(data);
                    setShowManagerSuggestions(true);
                }
            } else {
                setManagerSuggestions([]);
                setShowManagerSuggestions(false);
            }
        };

        const timeoutId = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(timeoutId);
    }, [storeForm.user_id]);

    const isMaster = user?.isMaster || user?.role === 'ADMIN_MASTER' || false;
    const hasMercado = isMaster || user?.admin_mercado || user?.role === 'ADMIN' || false;
    const hasSocial = isMaster || user?.admin_social || user?.role === 'ADMIN' || false;
    const hasEventos = isMaster || user?.admin_eventos || user?.role === 'ADMIN' || false;
    const hasNoticias = isMaster || user?.admin_noticias || user?.role === 'ADMIN' || false;


    const [loginBgUrl, setLoginBgUrl] = useState('');
    const [loginBgUploading, setLoginBgUploading] = useState(false);

    useEffect(() => {
        if (isMaster) {
            supabase.from('app_settings').select('value').eq('key', 'login_bg_url').single()
                .then(({ data }) => { if (data?.value?.url) setLoginBgUrl(data.value.url); });
        }
    }, [isMaster]);

    const handleLoginBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoginBgUploading(true);
        try {
            // 1. Comprimir e Upload da imagem
            let fileToUpload: File | Blob = file;
            if (file.type.startsWith('image/')) {
                try {
                    fileToUpload = await compressImage(file);
                } catch (e) {
                    console.warn('Falha na compressão:', e);
                }
            }

            const ext = file.name.split('.').pop();
            const fileName = `login_bg_${Date.now()}.${ext}`;
            const { error: uploadErr } = await supabase.storage.from('vaquejadas').upload(fileName, fileToUpload, { upsert: true });
            if (uploadErr) throw new Error('Erro no upload do arquivo: ' + uploadErr.message);
            
            const { data: { publicUrl } } = supabase.storage.from('vaquejadas').getPublicUrl(fileName);
            console.log('Upload OK, URL:', publicUrl);

            // 2. Salvar URL no app_settings (tenta update, se não existir faz insert)
            const { data: existing } = await supabase.from('app_settings').select('key').eq('key', 'login_bg_url').maybeSingle();
            
            let settingsErr;
            if (existing) {
                // Row já existe, faz update
                ({ error: settingsErr } = await supabase.from('app_settings')
                    .update({ value: { url: publicUrl } })
                    .eq('key', 'login_bg_url'));
            } else {
                // Row não existe, faz insert
                ({ error: settingsErr } = await supabase.from('app_settings')
                    .insert({ key: 'login_bg_url', value: { url: publicUrl } }));
            }
            
            if (settingsErr) throw new Error('Erro ao salvar configuração: ' + settingsErr.message);
            
            setLoginBgUrl(publicUrl);
            alert('✅ Fundo de login atualizado com sucesso!');
        } catch (err: any) {
            console.error('handleLoginBgUpload error:', err);
            alert('❌ ' + (err.message || 'Erro desconhecido'));
        } finally {
            setLoginBgUploading(false);
        }
    };

    useEffect(() => {
        // DIAGNÓSTICO FORÇADO
        if (hasMercado) {
            console.log("DEBUG: Perfil Admin Detectado. Role:", user?.role);
            fetchMarket();
            fetchStores();
        } else {
            console.log("DEBUG: Acesso negado ao Mercado. Role atual:", user?.role);
        }

        if (isMaster) fetchTotalUsers();
        if (hasEventos) fetchEvents();
        if (hasNoticias) {
            if (subviewNews === 'LIST') fetchNews();
            if (subviewNews === 'TV') fetchTransmissions();
        }
        
        if (hasSocial) {
             fetchPosts();
             fetchBanners();
        }
        if (activeTab === 'RESULTADOS') {
            fetchResults();
        }
    }, [isMaster, hasEventos, subviewEvents, hasNoticias, subviewNews, hasMercado, subviewMercado, hasSocial, subviewSocial, activeTab, subviewResults, user?.role]);

    const fetchTotalUsers = async () => {
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        if (count !== null) setTotalUsersCount(count);
    };

    const fetchEvents = async () => {
        try {
            const { data } = await supabase.from('events').select('*').order('created_at', { ascending: false });
            if (data) setEventsList(data);
        } catch (err) {
            console.error("Error fetching events:", err);
        }
    };


    const fetchNews = async () => {
        try {
            const { data } = await supabase.from('news').select('*').order('created_at', { ascending: false });
            if (data) setNewsList(data);
        } catch (err) {
            console.error("Error fetching news:", err);
        }
    };


    const fetchTransmissions = async () => {
        try {
            const { data } = await supabase.from('transmissions').select('*').order('created_at', { ascending: false });
            if (data) setTransmissionsList(data);
        } catch (err) {
            console.error("Error fetching transmissions:", err);
        }
    };


    const fetchMarket = async () => {
        try {
            const { data, count, error } = await supabase.from('market_items').select('*', { count: 'exact' });
            
            if (error) {
                console.error("Erro ao processar dados administrativos");
                return;
            }

            if (data) {
                setMarketList(data);
            }
        } catch (err: any) {
            console.error("Erro no fluxo administrativo");
        }
    };

    const fetchStores = async () => {
        try {
            const { data, error } = await supabase.from('stores').select(`*, profiles:user_id(username, name)`).order('created_at', { ascending: false });
            if (error) console.error("Erro ao buscar lojas");
            if (data) setStoresList(data);
        } catch(err) {
            console.error("Error fetching stores:", err);
        }
    };

    const fetchPosts = async () => {
        try {
            const { data } = await supabase.from('posts').select(`*, profiles:user_id(username, avatar_url, name)`).order('created_at', { ascending: false });
            if (data) setPostsList(data);
        } catch (err) {
            console.error("Error fetching posts:", err);
        }
    };

    const fetchBanners = async () => {
        try {
            const { data, error } = await supabase.from('banners').select('*').order('created_at', { ascending: false });
            if (error) console.error("Erro ao buscar banners");
            if (data) setBannersList(data);
        } catch(err) {
            console.error("Error fetching banners:", err);
        }
    };

    const fetchResults = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('resultados')
                .select('*, events(title, park, location)')
                .order('created_at', { ascending: false });
            if (data) {
                const mapped = data.map((r: any) => ({
                    ...r,
                    event_title: r.events?.title,
                    event_park: r.events?.park,
                    event_location: r.events?.location
                }));
                setResultsList(mapped);
            }
        } catch (err) {
            console.error("Error fetching results:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchResultDetails = async (resultId: string) => {
        setLoading(true);
        try {
            const { data: cats } = await supabase.from('resultado_categorias').select('*').eq('resultado_id', resultId).order('ordem', { ascending: true });
            const { data: lines } = await supabase.from('resultado_linhas').select('*').eq('resultado_id', resultId).order('ordem', { ascending: true });
            setResultCategories(cats || []);
            setResultLines(lines || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };


    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number | 'cover') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            // Comprimir imagem
            let fileToUpload: File | Blob = file;
            if (file.type.startsWith('image/')) {
                try {
                    fileToUpload = await compressImage(file);
                } catch (e) {
                    console.warn('Falha na compressão:', e);
                }
            }

            const fileExt = file.name.split('.').pop() || 'png';
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${fileName}`;

            // Converter para ArrayBuffer para maior compatibilidade no iOS/Capacitor
            // Isso evita erros de "Load failed" ao tentar ler o Blob durante o upload
            const arrayBuffer = await fileToUpload.arrayBuffer();

            const { error: uploadError } = await supabase.storage
                .from('vaquejadas')
                .upload(filePath, arrayBuffer, {
                    contentType: file.type,
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('vaquejadas')
                .getPublicUrl(filePath);

            const publicUrl = data.publicUrl;

            if (index === 'cover') {
                setEventForm((prev: any) => ({ ...prev, image_url: publicUrl }));
            } else {
                setEventForm((prev: any) => {
                    const currentGallery = Array.isArray(prev.galeria_urls) ? [...prev.galeria_urls] : [];
                    const newGallery = [...currentGallery];
                    newGallery[index as number] = publicUrl;
                    return { ...prev, galeria_urls: newGallery };
                });
            }
        } catch (error: any) {
            alert('Falha interna ao anexar imagem: ' + (error?.message || 'Arquivo inválido ou bloqueado.'));
        } finally {
            setLoading(false);
            // Reset input value to allow selecting same file again
            e.target.value = '';
        }
    };

    const handleSaveEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Clean empty strings from gallery before saving
            const cleanGallery = (eventForm.galeria_urls || []).filter((url: string) => url && url.trim() !== '');
            const payload = { ...eventForm, galeria_urls: cleanGallery, created_by: user.id };
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
            localStorage.removeItem('arena_admin_event_form');
            fetchEvents();
        } catch (err: any) { alert(err.message); }
        finally { setLoading(false); }
    };

    const toggleHideEvent = async (e_id: string, current: boolean) => {
        setLoading(true);
        const { error } = await supabase.from('events').update({ is_paused: !current }).eq('id', e_id);
        if (!error) fetchEvents();
        else { alert('Erro: ' + error.message); setLoading(false); }
    };

    const deleteEvent = async (id: string) => {
        if (!confirm('Excluir esta vaquejada permanentemente?')) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('events').delete().eq('id', id);
            if (error) throw error;
            fetchEvents();
        } catch (err: any) {
            alert('Erro ao excluir: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleNewsFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'pdf') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            // Comprimir imagem
            let fileToUpload: File | Blob = file;
            if (file.type.startsWith('image/')) {
                try {
                    fileToUpload = await compressImage(file);
                } catch (e) {
                    console.warn('Falha na compressão:', e);
                }
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_news_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('vaquejadas')
                .upload(filePath, fileToUpload);

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
            localStorage.removeItem('arena_admin_news_form');
        } catch (err: any) { alert(err.message); }
        finally { setLoading(false); }
    };

    const toggleHideNews = async (n_id: string, current: boolean) => {
        setLoading(true);
        const { error } = await supabase.from('news').update({ is_paused: !current }).eq('id', n_id);
        if (!error) fetchNews();
        else { alert('Erro: ' + error.message); setLoading(false); }
    };

    const handleSaveTransmission = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (!transmissionForm.authorized) {
                alert("Você deve declarar que possui autorização para compartilhar esta transmissão.");
                setLoading(false);
                return;
            }

            // Auto-extrai o ID do YouTube e gera thumbnail se não foi fornecida
            const videoId = extractYouTubeId(transmissionForm.youtube_url || '');
            const thumbnail = transmissionForm.thumbnail_url || (videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '');
            
            // Remove o campo 'authorized' do payload para não dar erro no banco
            const { authorized, ...cleanForm } = transmissionForm;
            
            const payload = {
                ...cleanForm,
                youtube_video_id: videoId || transmissionForm.youtube_video_id,
                thumbnail_url: thumbnail,
                channel_name: transmissionForm.channel_name || '+Vaquejada Oficial',
                active: true,
            };
            let error;
            if (transmissionForm.id) {
                ({ error } = await supabase.from('transmissions').update(payload).eq('id', transmissionForm.id));
            } else {
                ({ error } = await supabase.from('transmissions').insert([payload]));
            }
            if (error) throw error;
            alert(transmissionForm.id ? 'Transmissão atualizada!' : '✅ Transmissão publicada na TV +Vaquejada!');
            setTransmissionForm({});
            localStorage.removeItem('arena_admin_transm_form');
            fetchTransmissions();
        } catch (err: any) { alert(err.message); }
        finally { setLoading(false); }
    };

    const toggleTransmissionStatus = async (id: string, current: boolean) => {
        setLoading(true);
        const { error } = await supabase.from('transmissions').update({ active: !current }).eq('id', id);
        if (!error) fetchTransmissions();
        else { alert('Erro: ' + error.message); setLoading(false); }
    };

    const deleteTransmission = async (id: string) => {
        if (!confirm('Excluir esta transmissão?')) return;
        setLoading(true);
        const { error } = await supabase.from('transmissions').delete().eq('id', id);
        if (!error) fetchTransmissions();
        else { alert('Erro: ' + error.message); setLoading(false); }
    };

    // Marketplace Moderation
    const updateMarketStatus = async (m_id: string, newStatus: string) => {
        setLoading(true);
        const { error } = await supabase.from('market_items').update({ status: newStatus }).eq('id', m_id);
        if (!error) fetchMarket();
        else { alert('Erro: ' + error.message); setLoading(false); }
    };

    const deleteMarketItem = async (ad: any) => {
        if (!ad?.id) {
            alert('Erro: ID do anúncio não encontrado.');
            return;
        }

        if (!confirm(`Deseja EXCLUIR permanentemente o anúncio "${ad.title}"?`)) return;
        
        setLoading(true);
        try {
            // 1. O CAMINHO DO BOTÃO: Deletar primeiro, perguntar depois
            const { error: delError } = await supabase
                .from('market_items')
                .delete()
                .eq('id', ad.id);
            
            if (delError) {
                alert('Erro na Engenharia do Banco: ' + delError.message);
                return;
            }

            // 2. CAMINHO INVERSO: Tentar notificar o dono (Modo Seguro)
            try {
                // Só tenta notificar se tivermos os dados necessários
                if (ad.user_id && user?.id) {
                    await supabase.from('notifications').insert({
                        user_id: ad.user_id,
                        actor_id: user.id,
                        type: 'system',
                        message: `O +Vaquejada retirou do mercado o seu produto "${ad.title}" por não condizer com a política do aplicativo.`
                    });
                }
            } catch (notifyErr) {
                console.warn("Falha na notificação, mas o anúncio foi apagado.");
            }

            alert('Anúncio excluído com sucesso!');
            await fetchMarket();
        } catch (err: any) {
            alert('Erro no Caminho da Exclusão: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setLoading(false);
        }
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
            // Comprimir imagem
            let fileToUpload: File | Blob = file;
            if (file.type.startsWith('image/')) {
                try {
                    fileToUpload = await compressImage(file);
                } catch (e) {
                    console.warn('Falha na compressão:', e);
                }
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_banner.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('vaquejadas').upload(fileName, fileToUpload);
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
            localStorage.removeItem('arena_admin_banner_form');
            fetchBanners();
            alert('Propaganda salva!');
        } catch (err: any) { alert(err.message); }
        finally { setLoading(false); }
    };

    const handleSaveResult = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resultForm.evento_id) {
            alert('Selecione um evento!');
            return;
        }
        setLoading(true);
        try {
            const { event_title, event_park, event_location, ...cleanForm } = resultForm;
            const payload = {
                ...cleanForm,
                usuario_id: user.id,
                publicado_em: resultForm.status === 'publicado' ? new Date().toISOString() : resultForm.publicado_em
            };
            
            let resId = resultForm.id;
            if (resId) {
                const { error } = await supabase.from('resultados').update(payload).eq('id', resId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('resultados').insert([payload]).select().single();
                if (error) throw error;
                resId = data.id;
            }

            // Sync categories and lines
            await supabase.from('resultado_categorias').delete().eq('resultado_id', resId);
            // Lines are deleted automatically via CASCADE in DB if possible, but let's be explicit
            await supabase.from('resultado_linhas').delete().eq('resultado_id', resId);

            if (resultCategories.length > 0) {
                const catsToInsert = resultCategories.map((c, idx) => ({ 
                    resultado_id: resId, 
                    nome_categoria: c.nome_categoria,
                    ordem: idx 
                }));
                const { data: newCats, error: catErr } = await supabase.from('resultado_categorias').insert(catsToInsert).select();
                if (catErr) throw catErr;

                if (resultLines.length > 0 && newCats) {
                    const linesToInsert = resultLines.map((l, idx) => {
                        const oldCat = resultCategories.find(c => c.id === l.categoria_id);
                        const newCat = newCats.find(nc => nc.nome_categoria === oldCat?.nome_categoria);
                        const { id, ...lineData } = l;
                        return { 
                            ...lineData, 
                            resultado_id: resId, 
                            categoria_id: newCat?.id || l.categoria_id,
                            ordem: idx 
                        };
                    });
                    const { error: lineErr } = await supabase.from('resultado_linhas').insert(linesToInsert);
                    if (lineErr) throw lineErr;
                }
            }

            alert('✅ Resultado salvo com sucesso!');
            setSubviewResults('HOME');
            setResultForm({ status: 'rascunho' });
            setResultCategories([]);
            setResultLines([]);
            localStorage.removeItem('arena_admin_result_form');
            localStorage.removeItem('arena_admin_result_cats');
            localStorage.removeItem('arena_admin_result_lines');
            fetchResults();
        } catch (err: any) {
            alert('Erro ao salvar resultado: ' + err.message);
        } finally {
            setLoading(false);
        }
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
        <header className="px-6 py-6 border-b border-white/5 flex items-center gap-4 bg-[#0F0A05] sticky top-0 z-10 w-full">
            <button onClick={() => setActiveTab(onBackTab)} className="material-icons text-white active:scale-90 transition-transform">arrow_back</button>
            <h2 className="text-xl font-black uppercase italic tracking-tight text-white">{title}</h2>
        </header>
    );

    const MenuItem = ({ icon, label, onClick, badge, highlight }: any) => (
        <button 
            onClick={onClick} 
            className={`w-full bg-[#1A1108] border ${highlight ? 'border-[#D4AF37]/50 shadow-lg shadow-[#D4AF37]/10' : 'border-white/10'} rounded-[28px] p-5 flex items-center gap-4 active:scale-[0.98] transition-all mb-3 group hover:border-[#D4AF37]/30 shadow-sm`}
        >
            <div className={`w-12 h-12 ${highlight ? 'bg-[#D4AF37]' : 'bg-[#0F0A05]'} rounded-2xl flex items-center justify-center group-hover:bg-[#D4AF37]/10 transition-colors`}>
                <span className={`material-icons ${highlight ? 'text-white' : 'text-[#D4AF37]'}`}>{icon}</span>
            </div>
            <div className="flex-1 text-left">
                <p className="font-black text-sm text-white leading-tight uppercase tracking-tight">{label}</p>
                <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-0.5 italic">Gestão Oficial</p>
            </div>
            <div className="flex items-center gap-3">
                {badge && (
                    <span className="text-[10px] font-black text-[#D4AF37] px-2.5 py-1 bg-[#D4AF37]/10 rounded-lg">
                        {badge}
                    </span>
                )}
                <span className="material-icons text-white/20 group-hover:text-[#D4AF37] transition-colors">chevron_right</span>
            </div>
        </button>
    );

    const SectionTitle = ({ title }: { title: string }) => (
        <div className="px-6 py-4">
            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{title}</h3>
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
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center">
                    <span className="material-icons text-[#D4AF37]">manage_accounts</span>
                </div>
                <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-tighter italic">Classificar Administrativos</h4>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Delegar poderes para a equipe</p>
                </div>
            </div>
            
            <div className="relative mb-6">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons text-white/20">person_search</span>
                <input 
                    type="text" 
                    placeholder="Pesquisar usuário para promover..."
                    className="w-full bg-[#1A1108] border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm text-white font-bold outline-none focus:border-[#D4AF37] shadow-sm transition-all"
                    value={searchQuery}
                    onChange={(e) => searchUsers(e.target.value)}
                />
            </div>

            {searchResults.length > 0 && searchQuery.trim() !== '' && (
                <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] px-2">Resultados da Busca</p>
                    {searchResults.map(result => (
                        <div key={result.id} className="bg-[#1A1108] border border-white/10 p-5 rounded-[32px] shadow-sm relative overflow-hidden group">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 rounded-2xl border border-white/10 overflow-hidden shadow-sm relative">
                                    <img src={result.avatar_url || `https://ui-avatars.com/api/?name=${result.name || result.username}`} className="w-full h-full object-cover" />
                                    {result.role === 'ADMIN_MASTER' && <div className="absolute top-0 right-0 bg-[#D4AF37] p-0.5 rounded-bl-lg"><span className="material-icons text-white text-[10px]">stars</span></div>}
                                </div>
                                <div className="flex-1">
                                    <h5 className="font-black text-base text-white tracking-tight leading-none mb-1">{result.name || result.full_name || 'Sem Nome'}</h5>
                                    <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-widest leading-none">@{result.username || 'user'}</p>
                                    <div className="flex gap-2 mt-2">
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${result.role === 'ADMIN_MASTER' ? 'bg-[#D4AF37] text-white' : 'white/5 text-white/40'}`}>
                                            Cargo: {result.role}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => toggleSubAdminPermission(result.id, 'admin_mercado', result.admin_mercado)}
                                    className={`py-3 px-3 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-2 ${
                                        result.admin_mercado ? 'bg-[#D4AF37] border-[#D4AF37] text-white shadow-lg shadow-[#D4AF37]/20' : 'bg-white/5 text-white/20 border-neutral-100 hover:border-white/10'
                                    }`}
                                >
                                    <span className="material-icons text-sm">{result.admin_mercado ? 'storefront' : 'add'}</span>
                                    Mercado
                                </button>
                                <button 
                                    onClick={() => toggleSubAdminPermission(result.id, 'admin_social', result.admin_social)}
                                    className={`py-3 px-3 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-2 ${
                                        result.admin_social ? 'bg-[#4CAF50] border-[#4CAF50] text-white shadow-lg shadow-[#4CAF50]/20' : 'bg-white/5 text-white/20 border-neutral-100 hover:border-white/10'
                                    }`}
                                >
                                    <span className="material-icons text-sm">{result.admin_social ? 'campaign' : 'add'}</span>
                                    Propaganda
                                </button>
                                <button 
                                    onClick={() => toggleSubAdminPermission(result.id, 'admin_eventos', result.admin_eventos)}
                                    className={`py-3 px-3 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-2 ${
                                        result.admin_eventos ? 'bg-[#FF9B05] border-[#FF9B05] text-white shadow-lg shadow-[#FF9B05]/20' : 'bg-white/5 text-white/20 border-neutral-100 hover:border-white/10'
                                    }`}
                                >
                                    <span className="material-icons text-sm">{result.admin_eventos ? 'emoji_events' : 'add'}</span>
                                    Vaquejadas
                                </button>
                                <button 
                                    onClick={() => toggleSubAdminPermission(result.id, 'admin_noticias', result.admin_noticias)}
                                    className={`py-3 px-3 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-2 ${
                                        result.admin_noticias ? 'bg-[#FF4181] border-[#FF4181] text-white shadow-lg shadow-[#FF4181]/20' : 'bg-white/5 text-white/20 border-neutral-100 hover:border-white/10'
                                    }`}
                                >
                                    <span className="material-icons text-sm">{result.admin_noticias ? 'newspaper' : 'add'}</span>
                                    Notícias
                                </button>
                            </div>

                            {/* Dica informativa aparecer apenas ao master */}
                            <p className="mt-4 text-[8px] text-white/20 font-bold uppercase text-center tracking-widest">
                                {result.admin_mercado || result.admin_social || result.admin_eventos || result.admin_noticias 
                                    ? "Este usuário agora tem chaves de acesso modular." 
                                    : "Clique acima para promover a um cargo específico."}
                            </p>
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
            <div className="absolute inset-0 bg-[#0F0A05] flex flex-col z-[120]">
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
                        className="mx-6 p-4 flex gap-4 bg-[#1A1108] rounded-2xl border border-white/5 active:scale-95 transition-transform cursor-pointer shadow-sm"
                    >
                        <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-full flex items-center justify-center">
                            <span className="material-icons text-[#D4AF37]">group</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-xl font-black text-white">{totalUsersCount}</p>
                            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest leading-tight">Contas Registradas</p>
                            <p className="text-[8px] text-[#D4AF37] font-bold uppercase mt-1">Clique para ver lista completa</p>
                        </div>
                        <span className="material-icons text-white/20 self-center">
                            {showFullUserList ? 'expand_less' : 'expand_more'}
                        </span>
                    </div>

                    {showFullUserList && (
                        <div className="px-6 mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex gap-2 mb-2">
                                <button 
                                    onClick={() => setUserListSort('newest')}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                                        userListSort === 'newest' ? 'bg-[#D4AF37] text-white border-[#D4AF37]' : 'bg-[#1A1108] text-white/40 border-white/5'
                                    }`}
                                >ORDEM LOGIN</button>
                                <button 
                                    onClick={() => setUserListSort('name')}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                                        userListSort === 'name' ? 'bg-[#D4AF37] text-white border-[#D4AF37]' : 'bg-[#1A1108] text-white/40 border-white/5'
                                    }`}
                                >ORDEM ALFABÉTICA</button>
                            </div>

                            {sortedUsers.map(u => (
                                <div key={u.id} className="bg-[#1A1108] border border-white/5 p-4 rounded-xl flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full white/5 flex items-center justify-center overflow-hidden border border-white/10">
                                            {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : <span className="material-icons text-white/20 text-sm">person</span>}
                                        </div>
                                        <div>
                                            <p className="font-bold text-xs text-white leading-tight">{u.full_name || u.name || 'Sem Nome'}</p>
                                            <p className="text-[9px] text-white/40 lowercase">@{u.username || 'user'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-white/60 uppercase">{new Date(u.created_at).toLocaleDateString('pt-BR')}</p>
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
                                className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-sm text-white mb-4 outline-none focus:border-red-500/50 shadow-sm"
                                value={searchQuery}
                                onChange={(e) => searchUsers(e.target.value)}
                            />
                            <div className="space-y-2">
                                {(searchResults || []).map(result => (
                                    <div key={result.id} className="bg-[#1A1108] border border-red-500/10 p-3 rounded-xl flex items-center justify-between shadow-sm">
                                        <div>
                                            <p className="font-bold text-sm text-white">{result.name || result.full_name}</p>
                                            <p className="text-[10px] text-white/60">@{result.username}</p>
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
                    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 bg-[#D4AF37] text-[#0F0A05] rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl z-[300] animate-in slide-in-from-bottom duration-300">
                        {success}
                    </div>
                )}
            </div>
        );
    };

    const renderMercadoView = () => {
        if (subviewMercado === 'LIST') {
            return (
                <div className="absolute inset-0 bg-[#0F0A05] flex flex-col z-[120]">
                    <header className="px-6 py-6 border-b border-white/5 flex items-center gap-4 bg-[#0F0A05] sticky top-0 z-10 w-full">
                        <button onClick={() => setSubviewMercado('HOME')} className="material-icons text-white active:scale-90 transition-transform">arrow_back</button>
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Moderação do Mercado</h2>
                    </header>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {(marketList || []).length === 0 ? <p className="text-center text-xs opacity-50 py-10 font-bold uppercase tracking-widest">Nenhum anúncio criado.</p> : (marketList || []).map((ad) => (
                            <div key={ad.id} className={`bg-[#1A1108] border rounded-xl p-4 flex flex-col gap-3 ${ad.status === 'rejected' ? 'border-red-300 opacity-50' : ad.status === 'pending' ? 'border-yellow-400' : 'border-white/10'}`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${ad.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {ad.status === 'approved' ? 'APROVADO' : ad.status === 'pending' ? 'PENDENTE' : 'REJEITADO'}
                                            </span>
                                            <span className="text-[10px] uppercase font-bold text-white/60">{ad.price}</span>
                                        </div>
                                        <h4 className="font-bold text-sm leading-tight text-white">{ad.title}</h4>
                                        <p className="text-[10px] text-white/60 mt-0.5"><span className="material-icons text-[10px] mr-1">place</span>{ad.loc}</p>
                                    </div>
                                    <img src={ad.img} className="w-12 h-12 object-cover rounded shadow-sm shrink-0" alt="Anúncio" />
                                </div>
                                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-white/5">
                                    <button onClick={() => updateMarketStatus(ad.id, 'approved')} disabled={ad.status === 'approved'} className="text-[9px] font-black uppercase tracking-widest bg-green-500 text-white rounded-lg py-2 disabled:opacity-30">Aprovar</button>
                                    <button onClick={() => updateMarketStatus(ad.id, 'rejected')} disabled={ad.status === 'rejected'} className="text-[9px] font-black uppercase tracking-widest bg-yellow-500 text-white rounded-lg py-2 disabled:opacity-30">Ocultar</button>
                                    <button onClick={() => deleteMarketItem(ad)} className="text-[9px] font-black uppercase tracking-widest bg-red-100 text-red-600 rounded-lg py-2">Excluir Item</button>
                                </div>

                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (subviewMercado === 'STORES') {
            const handleStoreLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setLoading(true);
                try {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Date.now()}_store_logo.${fileExt}`;
                    const { error: uploadError } = await supabase.storage.from('vaquejadas').upload(fileName, file);
                    if (uploadError) throw uploadError;
                    const { data: { publicUrl } } = supabase.storage.from('vaquejadas').getPublicUrl(fileName);
                    setStoreForm({ ...storeForm, logo_url: publicUrl });
                } catch (err: any) { alert(err.message); }
                finally { setLoading(false); }
            };

            const handleSaveStore = async (e: React.FormEvent) => {
                e.preventDefault();
                setLoading(true);
                try {
                    let finalUserId = storeForm.user_id?.trim();
                    if (!finalUserId) throw new Error("ID ou Username (@) do Dono é obrigatório.");

                    // Validar @username e buscar ID
                    if (finalUserId.startsWith('@')) {
                        const cleanUsername = finalUserId.replace('@', '').toLowerCase();
                        const { data: profile, error: profErr } = await supabase
                            .from('profiles')
                            .select('id')
                            .eq('username', cleanUsername)
                            .maybeSingle();
                        
                        if (profErr || !profile) {
                            throw new Error(`Usuário gestor não encontrado: @${cleanUsername}`);
                        }
                        finalUserId = profile.id;
                    }

                    const payload = {
                        user_id: finalUserId,
                        name: storeForm.name,
                        cnpj: storeForm.cnpj,
                        logo_url: storeForm.logo_url,
                        description: storeForm.description,
                        is_official: storeForm.is_official || false,
                    };

                    let error;
                    let storeId;

                    if (storeForm.id) {
                        const { data, error: updateError } = await supabase
                            .from('stores')
                            .update(payload)
                            .eq('id', storeForm.id)
                            .select();
                        error = updateError;
                        storeId = storeForm.id;
                    } else {
                        const { data, error: insertError } = await supabase
                            .from('stores')
                            .insert(payload)
                            .select();
                        error = insertError;
                        if (data?.[0]) storeId = data[0].id;
                    }

                    if (error) throw error;

                    // Enviar Notificação para o Gestor
                    if (finalUserId && !storeForm.id) {
                        await supabase.from('notifications').insert({
                            user_id: finalUserId,
                            actor_id: user.id,
                            type: 'system',
                            message: `Você agora é gestor da loja ${storeForm.name}! 🚀`,
                            metadata: { type: 'store_manager', store_id: storeId }
                        });
                    }

                    setSuccess(storeForm.id ? 'Loja Atualizada' : 'Loja Criada com Sucesso!');
                    setStoreForm({ is_official: true });
                    localStorage.removeItem('arena_admin_store_form'); // Clear persistence after save
                    fetchStores();
                    setTimeout(() => setSuccess(null), 2000);
                } catch(error: any) {
                    alert('Erro ao salvar loja: ' + error.message);
                } finally {
                    setLoading(false);
                }
            };

            const toggleStoreStatus = async (id: string, currentStatus: boolean) => {
                await supabase.from('stores').update({ is_active: !currentStatus }).eq('id', id);
                fetchStores();
            };

            return (
                <div className="absolute inset-0 bg-[#0F0A05] flex flex-col z-[120]">
                    <header className="px-6 py-6 border-b border-white/5 flex items-center gap-4 bg-[#0F0A05] sticky top-0 z-10 w-full shadow-sm">
                        <button onClick={() => setSubviewMercado('HOME')} className="material-icons text-white active:scale-90 transition-transform">arrow_back</button>
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Lojas Parceiras</h2>
                    </header>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* FORMULÁRIO DE LOJA */}
                        <form onSubmit={handleSaveStore} className="bg-[#1A1108] p-6 rounded-[32px] border border-white/5 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">{storeForm.id ? 'Editar Loja' : 'Nova Loja Parceira'}</h3>
                                {storeForm.id && <button type="button" onClick={() => setStoreForm({ is_official: true })} className="text-[8px] font-black text-red-500 uppercase">Cancelar Edição</button>}
                            </div>

                            {/* Upload Logo PNG */}
                            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-dashed border-white/10">
                                <div className="w-16 h-16 bg-[#1A1108] rounded-xl border border-white/5 flex items-center justify-center overflow-hidden">
                                    {storeForm.logo_url ? (
                                        <img src={storeForm.logo_url} className="w-full h-full object-contain" />
                                    ) : (
                                        <span className="material-icons text-white/20 text-3xl">add_business</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black uppercase text-white/60 mb-1">Logo PNG da Loja</p>
                                    <label className="bg-[#D4AF37] text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest cursor-pointer active:scale-95 transition-transform inline-block">
                                        Selecionar PNG
                                        <input type="file" className="hidden" accept="image/png" onChange={handleStoreLogoUpload} />
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <input className="w-full bg-white/5 border border-white/5 rounded-xl p-4 text-sm font-bold text-white outline-none placeholder:text-white/30" placeholder="Nome da Loja / Parque" value={storeForm.name || ''} onChange={e => setStoreForm({...storeForm, name: e.target.value})} required />
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <input className="w-full bg-white/5 border border-white/5 rounded-xl p-4 text-sm font-bold text-white outline-none placeholder:text-white/30" placeholder="CNPJ da Loja" value={storeForm.cnpj || ''} onChange={e => setStoreForm({...storeForm, cnpj: e.target.value})} required />
                                    <div className="relative w-full">
                                        <input 
                                            className="w-full bg-white/5 border border-white/5 rounded-xl p-4 text-sm font-bold text-white outline-none placeholder:text-white/30" 
                                            placeholder="@username do Gestor" 
                                            value={storeForm.user_id || ''} 
                                            onChange={e => {
                                                setStoreForm({...storeForm, user_id: e.target.value});
                                                setShowManagerSuggestions(true);
                                            }} 
                                            required 
                                        />
                                        {showManagerSuggestions && (managerSuggestions || []).length > 0 && (
                                            <div className="absolute z-50 w-full mt-2 bg-[#1A1108] border border-white/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                {(managerSuggestions || []).map(s => (
                                                    <div 
                                                        key={s.id} 
                                                        onClick={() => {
                                                            setStoreForm({...storeForm, user_id: `@${s.username}`});
                                                            setShowManagerSuggestions(false);
                                                        }}
                                                        className="flex items-center gap-3 p-3 hover:bg-[#0F0A05] cursor-pointer transition-colors border-b border-white/5 last:border-0"
                                                    >
                                                        <img src={s.avatar_url || `https://ui-avatars.com/api/?name=${s.name}`} className="w-8 h-8 rounded-full object-cover bg-neutral-200" />
                                                        <div className="flex-1 overflow-hidden">
                                                            <p className="text-xs font-black text-white truncate uppercase">{s.name}</p>
                                                            <p className="text-[10px] font-bold text-[#D4AF37] truncate">@{s.username}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <textarea className="w-full bg-white/5 border border-white/5 rounded-xl p-4 text-sm font-bold text-white outline-none placeholder:text-white/30" placeholder="Descrição curta (Opcional)" rows={2} value={storeForm.description || ''} onChange={e => setStoreForm({...storeForm, description: e.target.value})} />
                                
                                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                                    <input type="checkbox" id="official_chk" checked={storeForm.is_official || false} onChange={e => setStoreForm({...storeForm, is_official: e.target.checked})} className="w-5 h-5 accent-[#D4AF37]" />
                                    <label htmlFor="official_chk" className="text-[10px] font-black uppercase text-white cursor-pointer">Selo de Loja Oficial / Parceira</label>
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="w-full bg-[#1A1108] text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl active:scale-95 transition-transform disabled:opacity-50">
                                {loading ? 'Processando...' : storeForm.id ? 'Atualizar Loja' : 'Criar e Notificar Gestor'}
                            </button>
                        </form>


                        {/* LISTA DE LOJAS */}
                        <div className="space-y-4 mt-6">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Lojas Cadastradas ({(storesList || []).length})</h3>
                            {(storesList || []).map(store => (
                                <div key={store.id} className={`bg-[#1A1108] border p-4 rounded-2xl flex flex-col gap-3 ${store.is_active ? 'border-white/10' : 'border-red-300 opacity-60'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-black text-sm uppercase text-white">{store.name}</h4>
                                                {store.is_official && <span className="material-icons text-[14px] text-green-500">verified</span>}
                                            </div>
                                            <p className="text-[10px] font-bold text-white/40">Dono: @{store.profiles?.username || 'desconhecido'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-2 border-t border-white/5">
                                        <button onClick={() => setStoreForm(store)} className="flex-1 text-[9px] font-black uppercase tracking-widest bg-neutral-100 text-white rounded-lg py-2">Editar</button>
                                        <button onClick={() => toggleStoreStatus(store.id, store.is_active)} className={`flex-1 text-[9px] font-black uppercase tracking-widest rounded-lg py-2 ${store.is_active ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                            {store.is_active ? 'Desativar' : 'Ativar'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="absolute inset-0 bg-[#0F0A05] flex flex-col z-[120]">
                <SubHeader title="Gestão do Mercado" />
                <div className="flex-1 overflow-y-auto">
                    <SectionTitle title="Métricas & Ações" />


                    <div className="px-6 space-y-4">
                        {/* Card de Resumo */}
                        <div className="bg-[#1A1108] p-6 rounded-[32px] border border-white/5 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-black text-white">{(marketList || []).length}</p>
                                <p className="text-[10px] text-white/40 uppercase font-black tracking-widest leading-tight">Total de Anúncios</p>
                            </div>
                            <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center">
                                <span className="material-icons text-[#D4AF37]">storefront</span>
                            </div>
                        </div>

                        {/* Botão para Lista Completa */}
                        <button onClick={() => setSubviewMercado('LIST')} className="w-full bg-[#1A1108] border border-white/10 text-white p-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-between active:scale-95 shadow-sm group">
                            <div className="flex items-center gap-3">
                                <div className="bg-[#D4AF37]/10 w-10 h-10 rounded-lg flex items-center justify-center">
                                    <span className="material-icons text-[#D4AF37]">fact_check</span>
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-sm text-white">Gerenciar Mural</p>
                                    <p className="text-[9px] text-white/40 uppercase">Aprovar, Ocultar ou Excluir</p>
                                </div>
                            </div>
                            <span className="material-icons text-white/20 group-hover:text-[#D4AF37] transition-colors">chevron_right</span>
                        </button>

                        <button onClick={() => setSubviewMercado('STORES')} className="w-full bg-[#1A1108] border border-white/10 text-white p-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-between active:scale-95 shadow-sm group">
                            <div className="flex items-center gap-3">
                                <div className="bg-green-500/10 w-10 h-10 rounded-lg flex items-center justify-center">
                                    <span className="material-icons text-green-500">store</span>
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-sm text-white">Gerenciar Lojas (Módulo 2)</p>
                                    <p className="text-[9px] text-white/40 uppercase">Lojas Oficiais e Parceiros</p>
                                </div>
                            </div>
                            <span className="material-icons text-white/20 group-hover:text-[#D4AF37] transition-colors">chevron_right</span>
                        </button>
                    </div>

                </div>

            </div>
        );
    };

    const renderSocialView = () => {
        if (subviewSocial === 'LIST') {
            return (
                <div className="absolute inset-0 bg-[#0F0A05] flex flex-col z-[120]">
                    <header className="px-6 py-6 border-b border-white/5 flex items-center gap-4 bg-[#0F0A05] sticky top-0 z-10 w-full shadow-sm">
                        <button onClick={() => setSubviewSocial('HOME')} className="material-icons text-white active:scale-90 transition-transform">arrow_back</button>
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Moderação de Posts</h2>
                    </header>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {(postsList || []).length === 0 ? <p className="text-center text-xs opacity-50 py-10 font-bold uppercase tracking-widest">Nenhum post registrado no banco.</p> : (postsList || []).map((post) => (
                            <div key={post.id} className={`bg-[#1A1108] border rounded-xl p-4 flex flex-col gap-3 ${post.is_hidden ? 'border-red-300 bg-red-50/50 opacity-70' : 'border-white/10'}`}>
                                <div className="flex items-center gap-3">
                                    <img src={post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${post.profiles?.username}`} className="w-8 h-8 rounded-full shadow-sm" alt="User" />
                                    <div className="flex-1">
                                        <p className="font-bold text-xs text-white leading-tight">@{post.profiles?.username || 'user_unknown'}</p>
                                        <p className="text-[9px] text-white/40">ID: {post.id.split('-')[0]}</p>
                                    </div>
                                    <button onClick={() => toggleHidePost(post.id, post.is_hidden)} className={`p-2 rounded-lg material-icons text-sm shadow-sm border transition-colors ${post.is_hidden ? 'bg-red-500 border-red-600 text-white' : 'bg-[#1A1108] border-white/10 text-red-500'}`}>
                                        {post.is_hidden ? 'visibility_off' : 'visibility'}
                                    </button>
                                </div>
                                {post.content && <p className="text-xs text-white font-medium bg-white/5 p-2 rounded-lg border border-white/5">{post.content}</p>}
                                {post.media_url && <img src={post.media_url} className="w-full h-32 object-cover rounded-xl mt-1 opacity-80" alt="Post media" />}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="absolute inset-0 bg-[#0F0A05] flex flex-col z-[120]">
                <SubHeader title="Propagandas & Social" />
                <div className="flex-1 overflow-y-auto pb-24">
                    <SectionTitle title="Gestão de Banners (Propaganda)" />
                    <div className="px-6 mb-6">
                        <form onSubmit={handleSaveBanner} className="bg-[#1A1108] p-6 rounded-[32px] border border-white/5 shadow-sm space-y-4 overflow-hidden relative">
                             <div className="relative aspect-[4/1] bg-white/5 rounded-2xl overflow-hidden border-2 border-dashed border-white/10 group">
                                {bannerForm.image_url ? (
                                    <>
                                        <img src={bannerForm.image_url} className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => setBannerForm({...bannerForm, image_url: ''})} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full material-icons text-sm shadow-xl">close</button>
                                    </>
                                ) : (
                                    <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-100 transition-colors">
                                        <span className="material-icons text-3xl text-[#D4AF37] mb-1">add_photo_alternate</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Banner (800x200 recomendado)</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleBannerFileUpload} />
                                    </label>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-[#D4AF37]" placeholder="Anunciante / Título" value={bannerForm.title || ''} onChange={(e)=>setBannerForm({...bannerForm, title: e.target.value})} required />
                                <input className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-[#D4AF37]" placeholder="Link (Opcional)" value={bannerForm.link_url || ''} onChange={(e)=>setBannerForm({...bannerForm, link_url: e.target.value})} />
                            </div>
                            <button type="submit" disabled={loading} className="w-full bg-[#1A1108] text-white p-4 rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-xl">
                                 {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="material-icons text-sm">save</span>}
                                 {bannerForm.id ? "Atualizar Propaganda" : "Ativar Propaganda"}
                            </button>
                            {bannerForm.id && <button type="button" onClick={() => setBannerForm({})} className="w-full text-[9px] font-black uppercase tracking-widest text-[#D4AF37] mt-2">Cancelar Edição</button>}
                        </form>
                    </div>

                    <div className="px-6 space-y-3">
                        {(bannersList || []).map((b) => (
                            <div key={b.id} className="bg-[#1A1108] border border-white/5 rounded-2xl p-3 flex items-center gap-4 shadow-sm group">
                                <div className="w-16 h-10 bg-neutral-100 rounded-lg overflow-hidden border border-white/5">
                                    <img src={b.image_url} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-tight text-white truncate">{b.title}</p>
                                    <p className="text-[8px] font-bold text-[#D4AF37] truncate">{b.link_url || 'Sem link externo'}</p>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <button onClick={() => setBannerForm(b)} className="w-8 h-8 rounded-lg bg-white/5 text-white/40 flex items-center justify-center hover:text-white hover:bg-[#1A1108] transition-all">
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
                        <button onClick={() => setSubviewSocial('LIST')} className="w-full bg-[#1A1108] border border-white/10 text-white p-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-between active:scale-95 shadow-sm group">
                            <div className="flex items-center gap-3">
                                <div className="bg-[#D4AF37]/10 w-10 h-10 rounded-lg flex items-center justify-center text-[#D4AF37]">
                                    <span className="material-icons">forum</span>
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-sm text-white leading-tight">Moderar Timeline</p>
                                    <p className="text-[9px] text-white/40 uppercase">Ocultar posts de usuários</p>
                                </div>
                            </div>
                            <span className="material-icons text-white/20 group-hover:text-[#D4AF37] transition-colors">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderEventosView = () => {
        if (subviewEvents === 'CREATE') {
            const handleGetGPS = () => {
                if (!navigator.geolocation) {
                    alert("Geolocalização não é suportada por este navegador.");
                    return;
                }
                setLoading(true);
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        setEventForm({
                            ...eventForm,
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude
                        });
                        setLoading(false);
                        alert("Coordenadas obtidas com sucesso!");
                    },
                    (err) => {
                        setLoading(false);
                        alert("Erro ao obter GPS: " + err.message);
                    }
                );
            };

            return (
                <div className="absolute inset-0 bg-[#0F0A05] flex flex-col z-[120]">
                    <header className="px-6 py-6 border-b border-white/5 flex items-center gap-4 bg-[#0F0A05] sticky top-0 z-10 w-full">
                        <button onClick={() => {
                            if (eventForm.id) setSubviewEvents('LIST');
                            else setSubviewEvents('HOME');
                        }} className="material-icons text-white active:scale-90 transition-transform">arrow_back</button>
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">{eventForm.id ? "Editar Vaquejada" : "Nova Vaquejada"}</h2>
                    </header>
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        <form onSubmit={handleSaveEvent} className="space-y-6">
                            
                            {/* Sessão 1: Básico */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Informações Básicas</label>
                                <input className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-sm text-white font-bold focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Nome da Vaquejada" required value={eventForm.title || ''} onChange={(e)=>setEventForm({...eventForm, title: e.target.value})} />
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <input className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-sm text-white font-bold focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Parque" value={eventForm.park || ''} onChange={(e)=>setEventForm({...eventForm, park: e.target.value})} />
                                    <input className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-sm text-white font-bold focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Cidade / UF" value={eventForm.location || ''} onChange={(e)=>setEventForm({...eventForm, location: e.target.value})} />
                                </div>

                                {/* Date Picker Automático */}
                                <DateRangePicker 
                                    startDate={eventForm.start_date || ''}
                                    endDate={eventForm.end_date || ''}
                                    onChange={(start, end) => {
                                        if (!start) return;
                                        
                                        const startDateObj = new Date(start + 'T12:00:00');
                                        const endDateObj = end ? new Date(end + 'T12:00:00') : startDateObj;
                                        
                                        const sDay = startDateObj.getDate().toString().padStart(2, '0');
                                        const eDay = endDateObj.getDate().toString().padStart(2, '0');
                                        
                                        let generatedDateDay = sDay;
                                        if (start !== end && sDay !== eDay) {
                                            const startNum = parseInt(sDay);
                                            const endNum = parseInt(eDay);
                                            // Handle cross-month later, keep it simple for now
                                            if (endNum > startNum) {
                                                const days = [];
                                                for(let i=startNum; i<=endNum; i++){
                                                    days.push(i.toString().padStart(2, '0'));
                                                }
                                                if (days.length === 2) {
                                                    generatedDateDay = `${days[0]} e ${days[1]}`;
                                                } else if (days.length > 2) {
                                                    const last = days.pop();
                                                    generatedDateDay = `${days.join(', ')} e ${last}`;
                                                }
                                            } else {
                                                generatedDateDay = `${sDay} a ${eDay}`;
                                            }
                                        }

                                        const monthsPt = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                                        const generatedDateMonth = monthsPt[startDateObj.getMonth()];

                                        setEventForm({
                                            ...eventForm,
                                            start_date: start,
                                            end_date: end || start,
                                            date_day: generatedDateDay,
                                            date_month: generatedDateMonth
                                        });
                                    }}
                                />

                                {/* Campos Visuais Legados (ReadOnly para conferência) */}
                                <div className="grid grid-cols-2 gap-3 opacity-50 pointer-events-none">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-white/30 uppercase ml-2">Mês Visual</p>
                                        <input className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-sm text-white font-bold" value={eventForm.date_month || ''} readOnly />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-white/30 uppercase ml-2">Dia Visual</p>
                                        <input className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-sm text-white font-bold" value={eventForm.date_day || ''} readOnly />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-white/30 uppercase ml-2">Status</p>
                                        <select 
                                            className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-sm text-white font-bold focus:border-[#D4AF37] outline-none shadow-sm appearance-none"
                                            value={eventForm.status || 'em_breve'}
                                            onChange={(e) => setEventForm({...eventForm, status: e.target.value})}
                                        >
                                            <option value="em_breve">Em Breve</option>
                                            <option value="confirmado">Confirmado</option>
                                            <option value="acontecendo">Acontecendo</option>
                                            <option value="encerrado">Encerrado</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-white/30 uppercase ml-2">Categoria</p>
                                        <input className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-sm text-white font-bold focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Ex: Profissional" value={eventForm.category || ''} onChange={(e)=>setEventForm({...eventForm, category: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            {/* Sessão 2: Localização Avançada */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Geolocalização & Endereço</label>
                                <textarea className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-sm text-white font-bold focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Endereço Completo" rows={2} value={eventForm.endereco || ''} onChange={(e)=>setEventForm({...eventForm, endereco: e.target.value})} />
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <input className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-[10px] text-white font-bold outline-none" placeholder="Latitude" value={eventForm.latitude || ''} readOnly />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 material-icons text-[12px] text-white/20">map</span>
                                    </div>
                                    <div className="relative">
                                        <input className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-[10px] text-white font-bold outline-none" placeholder="Longitude" value={eventForm.longitude || ''} readOnly />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 material-icons text-[12px] text-white/20">map</span>
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={handleGetGPS}
                                    className="w-full h-12 white/5 border border-white/10 text-white rounded-xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                                >
                                    <span className="material-icons text-sm">my_location</span>
                                    Capturar GPS Atual (No Local)
                                </button>
                            </div>

                            {/* Sessão 3: Valores e Horários */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Financeiro & Horários</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <input className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-sm text-white font-bold focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Valor Inscrição" value={eventForm.valor_inscricao || ''} onChange={(e)=>setEventForm({...eventForm, valor_inscricao: e.target.value})} />
                                    <input className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-sm text-white font-bold focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Valor Ingresso" value={eventForm.valor_ingresso || ''} onChange={(e)=>setEventForm({...eventForm, valor_ingresso: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black text-white/30 uppercase ml-2">Horário Início</p>
                                        <input type="time" className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-sm text-white font-bold focus:border-[#D4AF37] outline-none shadow-sm" value={eventForm.horario_inicio || ''} onChange={(e)=>setEventForm({...eventForm, horario_inicio: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black text-white/30 uppercase ml-2">Horário Fim</p>
                                        <input type="time" className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-sm text-white font-bold focus:border-[#D4AF37] outline-none shadow-sm" value={eventForm.horario_fim || ''} onChange={(e)=>setEventForm({...eventForm, horario_fim: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            {/* Sessão 4: Contato */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Contatos da Organização</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <input className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 pl-10 text-sm text-white font-bold focus:border-[#D4AF37] outline-none shadow-sm" placeholder="WhatsApp" value={eventForm.whatsapp || ''} onChange={(e)=>setEventForm({...eventForm, whatsapp: e.target.value})} />
                                        <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#25D366]">chat</span>
                                    </div>
                                    <div className="relative">
                                        <input className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 pl-10 text-sm text-white font-bold focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Instagram (@)" value={eventForm.instagram || ''} onChange={(e)=>setEventForm({...eventForm, instagram: e.target.value})} />
                                        <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#E1306C]">photo_camera</span>
                                    </div>
                                </div>
                                <input className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-sm text-white font-bold focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Telefone de Contato" value={eventForm.phone || ''} onChange={(e)=>setEventForm({...eventForm, phone: e.target.value})} />
                            </div>

                            {/* Imagens */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Imagens & Banners</label>
                                <div className="relative aspect-video bg-[#1A1108] border-2 border-dashed border-white/10 rounded-3xl overflow-hidden group">
                                    {eventForm.image_url ? (
                                        <>
                                            <img src={eventForm.image_url} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                                <label className="bg-[#1A1108] text-white p-3 rounded-full cursor-pointer shadow-xl"><span className="material-icons">cached</span><input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'cover')} /></label>
                                                <button type="button" onClick={() => setEventForm({...eventForm, image_url: ''})} className="bg-red-500 text-white p-3 rounded-full shadow-xl"><span className="material-icons">delete</span></button>
                                            </div>
                                        </>
                                    ) : (
                                        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                                            <span className="material-icons text-4xl text-[#D4AF37] mb-2">add_photo_alternate</span>
                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Banner Principal</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'cover')} />
                                        </label>
                                    )}
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                    {[0, 1, 2, 3].map((idx) => {
                                        const imgUrl = (eventForm.galeria_urls || [])[idx];
                                        return (
                                            <div key={idx} className="aspect-square bg-[#1A1108] border border-white/10 rounded-2xl overflow-hidden relative group">
                                                {imgUrl ? (
                                                    <>
                                                        <img src={imgUrl} className="w-full h-full object-cover" />
                                                        <button type="button" onClick={() => {
                                                            const newGal = [...(eventForm.galeria_urls || [])];
                                                            newGal[idx] = '';
                                                            setEventForm({...eventForm, galeria_urls: newGal});
                                                        }} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                            <span className="material-icons text-white text-sm">delete</span>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <label className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-white/5">
                                                        <span className="material-icons text-white/20">add</span>
                                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, idx)} />
                                                    </label>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5">
                                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1 mb-4">Descrição Completa</h3>
                                <textarea className="w-full bg-[#1A1108] border border-white/10 rounded-[32px] p-6 text-sm text-white font-medium outline-none focus:border-[#D4AF37] shadow-sm" rows={6} placeholder="Conte detalhes sobre a premiação, regras e atrações..." value={eventForm.description || ''} onChange={(e)=>setEventForm({...eventForm, description: e.target.value})} />
                            </div>

                            <div className="flex items-center gap-3 bg-[#1A1108] p-4 rounded-xl border border-white/5 shadow-sm">
                                <input type="checkbox" id="hl_event" checked={eventForm.is_highlight || false} onChange={(e)=>setEventForm({...eventForm, is_highlight: e.target.checked})} className="w-6 h-6 accent-[#D4AF37] cursor-pointer" />
                                <label htmlFor="hl_event" className="text-xs font-black text-white block cursor-pointer select-none uppercase tracking-tight">Destacar no topo do App</label>
                            </div>

                            <button type="submit" disabled={loading} className="w-full h-16 bg-[#1A1108] text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl active:scale-95 transition-all mt-4">
                                {loading ? 'Publicando...' : eventForm.id ? 'Salvar Alterações' : 'Publicar Vaquejada'}
                            </button>
                            <button type="button" onClick={()=>setSubviewEvents('HOME')} className="w-full bg-transparent text-white/40 p-3 rounded-xl font-black uppercase text-[10px] tracking-widest">Descartar Alterações</button>
                        </form>
                    </div>
                </div>
            );
        }

        if (subviewEvents === 'LIST') {
            return (
                <div className="absolute inset-0 bg-[#0F0A05] flex flex-col z-[120]">
                    <header className="px-6 py-6 border-b border-white/5 flex items-center gap-4 bg-[#0F0A05] sticky top-0 z-10 w-full shadow-sm">
                        <button onClick={() => setSubviewEvents('HOME')} className="material-icons text-white active:scale-90">arrow_back</button>
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Lista de Vaquejadas</h2>
                    </header>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {(eventsList || []).length === 0 ? <p className="text-center text-xs opacity-50 py-10 font-bold uppercase tracking-widest">Nenhuma vaquejada registrada.</p> : (eventsList || []).map((ev) => (
                            <div key={ev.id} className={`bg-[#1A1108] border rounded-[28px] p-5 flex justify-between items-center shadow-sm border-white/10`}>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-sm text-white leading-tight uppercase truncate">{ev.title}</h4>
                                    <p className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest mt-1 italic">{ev.date_day} {ev.date_month} - {ev.park}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setEventForm(ev); setSubviewEvents('CREATE'); }} className="w-10 h-10 rounded-2xl bg-white/5 text-white/60 flex items-center justify-center active:scale-90 transition-transform">
                                        <span className="material-icons text-lg">edit</span>
                                    </button>
                                    <button onClick={() => deleteEvent(ev.id)} className="w-10 h-10 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center active:scale-90 transition-transform">
                                        <span className="material-icons text-lg">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }


        return (
            <div className="absolute inset-0 bg-[#0F0A05] flex flex-col z-[120]">
                <header className="px-6 py-6 border-b border-white/5 flex items-center gap-4 bg-[#0F0A05] sticky top-0 z-10 w-full shadow-sm">
                    <button onClick={() => setActiveTab('MAIN')} className="material-icons text-white active:scale-90">arrow_back</button>
                    <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Vaquejadas</h2>
                </header>
                <div className="flex-1 overflow-y-auto p-6">
                    <MenuItem icon="add_location" label="Adicionar Vaquejada" onClick={() => { setEventForm({ is_highlight: false, category: 'Profissional' }); setSubviewEvents('CREATE'); }} />
                    <MenuItem icon="event_note" label="Gerenciar Vaquejadas" onClick={() => setSubviewEvents('LIST')} badge={eventsList.length || undefined} />
                </div>
            </div>
        );
    };

    const renderResultadosView = () => {

        if (subviewResults === 'CREATE') {
            return (
                <div className="absolute inset-0 bg-[#0F0A05] flex flex-col z-[120]">
                    <header className="px-6 py-6 border-b border-white/5 flex items-center gap-4 bg-[#0F0A05] sticky top-0 z-10 w-full shadow-sm">
                        <button onClick={() => {
                            if (resultForm.id) setSubviewResults('LIST');
                            else setSubviewResults('HOME');
                        }} className="material-icons text-white active:scale-90">arrow_back</button>
                        <div>
                            <h2 className="text-xl font-black uppercase italic tracking-tight text-white">{resultForm.id ? "Editar Resultado" : "Novo Resultado"}</h2>
                            <p className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]">Vínculo com Evento Oficial</p>
                        </div>
                    </header>
                    <div className="flex-1 overflow-y-auto p-6">
                        <form onSubmit={handleSaveResult} className="space-y-8 pb-32">
                            
                            {/* Sessão 1: Básico */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Informações Básicas</label>
                                
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-white/30 uppercase ml-2">Evento Vinculado (Obrigatório)</p>
                                    <select 
                                        className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-sm text-white font-bold focus:border-[#D4AF37] outline-none shadow-sm appearance-none"
                                        value={resultForm.evento_id || ''}
                                        onChange={(e) => setResultForm({...resultForm, evento_id: e.target.value})}
                                        required
                                    >
                                        <option value="">Selecione o Evento...</option>
                                        {(eventsList || []).map(ev => (
                                            <option key={ev.id} value={ev.id}>{ev.title} ({ev.date_day} {ev.date_month})</option>
                                        ))}
                                    </select>
                                </div>

                                <input className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-sm text-white font-bold focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Título do Resultado (ex: Campeões da 15ª Vaquejada)" required value={resultForm.titulo || ''} onChange={(e)=>setResultForm({...resultForm, titulo: e.target.value})} />
                                <textarea className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-sm text-white font-bold focus:border-[#D4AF37] outline-none shadow-sm resize-none" placeholder="Descrição curta / Observações gerais" rows={3} value={resultForm.descricao || ''} onChange={(e)=>setResultForm({...resultForm, descricao: e.target.value})} />
                            </div>

                            {/* Sessão 2: Categorias */}
                            <div className="space-y-4 bg-[#1A1108] p-6 rounded-[32px] border border-white/5 shadow-inner">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Categorias do Ranking</label>
                                    <button type="button" onClick={() => {
                                        const newCat = { id: 'temp_' + Date.now(), nome_categoria: '' };
                                        setResultCategories([...resultCategories, newCat]);
                                    }} className="text-[10px] font-black text-[#D4AF37] uppercase flex items-center gap-1">
                                        <span className="material-icons text-sm">add_circle</span> Adicionar Categoria
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {resultCategories.map((cat, cIdx) => (
                                        <div key={cat.id} className="bg-[#1A1108] border border-white/10 rounded-2xl p-4">
                                            <div className="flex items-center gap-3 mb-4">
                                                <input 
                                                    className="flex-1 bg-[#0F0A05] border border-transparent border-b-[#D4AF37]/30 p-2 text-sm font-black text-white focus:border-b-[#D4AF37] outline-none rounded-lg" 
                                                    placeholder="Nome da Categoria (Ex: Profissional)"
                                                    value={cat.nome_categoria}
                                                    onChange={(e) => {
                                                        const newCats = [...resultCategories];
                                                        newCats[cIdx].nome_categoria = e.target.value;
                                                        setResultCategories(newCats);
                                                    }}
                                                />
                                                <button type="button" onClick={() => {
                                                    setResultCategories(resultCategories.filter((_, i) => i !== cIdx));
                                                    setResultLines(resultLines.filter(l => l.categoria_id !== cat.id));
                                                }} className="material-icons text-red-400 text-sm">delete</button>
                                            </div>

                                            {/* Linhas dessa categoria */}
                                            <div className="space-y-3 pl-2 border-l-2 border-[#D4AF37]/20">
                                                {resultLines.filter(l => l.categoria_id === cat.id).map((line, lIdx) => {
                                                    const globalIdx = resultLines.indexOf(line);
                                                    return (
                                                        <div key={globalIdx} className="bg-white/5 rounded-xl p-3 text-[10px] relative group">
                                                            <div className="grid grid-cols-6 gap-2 mb-2">
                                                                <input className="col-span-1 bg-[#0F0A05] border border-white/10 rounded p-2 font-black text-white text-center" placeholder="Pos" value={line.colocacao || ''} onChange={(e) => {
                                                                    const newLines = [...resultLines];
                                                                    newLines[globalIdx].colocacao = e.target.value;
                                                                    setResultLines(newLines);
                                                                }} />
                                                                <div className="col-span-5 relative">
                                                                    <div className="flex items-center gap-1 bg-[#0F0A05] border border-white/10 rounded p-2">
                                                                        <input 
                                                                            className="flex-1 font-bold outline-none bg-transparent text-white" 
                                                                            placeholder="Competidor/Dupla" 
                                                                            value={line.nome_competidor || ''} 
                                                                            onChange={async (e) => {
                                                                                const val = e.target.value;
                                                                                const newLines = [...resultLines];
                                                                                newLines[globalIdx].nome_competidor = val;
                                                                                
                                                                                // Se apagou o nome, limpa o vínculo
                                                                                if (!val) newLines[globalIdx].usuario_vinculado_id = null;
                                                                                
                                                                                setResultLines(newLines);
                                                                                setActiveResultLineIdx(globalIdx);

                                                                                if (val.length >= 3) {
                                                                                    const { data } = await supabase
                                                                                        .from('profiles')
                                                                                        .select('id, username, name, avatar_url')
                                                                                        .or(`username.ilike.%${val}%,name.ilike.%${val}%`)
                                                                                        .limit(5);
                                                                                    setResultUserSuggestions(data || []);
                                                                                } else {
                                                                                    setResultUserSuggestions([]);
                                                                                }
                                                                            }} 
                                                                        />
                                                                        {line.usuario_vinculado_id && (
                                                                            <span className="material-icons text-[12px] text-[#D4AF37]">verified</span>
                                                                        )}
                                                                    </div>

                                                                    {/* Sugestões de Usuários */}
                                                                    {activeResultLineIdx === globalIdx && resultUserSuggestions.length > 0 && (
                                                                        <div className="absolute top-full left-0 right-0 bg-[#1A1108] border border-white/10 rounded-lg shadow-xl z-50 mt-1 max-h-40 overflow-y-auto">
                                                                            {resultUserSuggestions.map(u => (
                                                                                <div 
                                                                                    key={u.id}
                                                                                    onClick={() => {
                                                                                        const newLines = [...resultLines];
                                                                                        newLines[globalIdx].nome_competidor = u.name || u.username;
                                                                                        newLines[globalIdx].usuario_vinculado_id = u.id;
                                                                                        setResultLines(newLines);
                                                                                        setResultUserSuggestions([]);
                                                                                        setActiveResultLineIdx(null);
                                                                                    }}
                                                                                    className="p-2 flex items-center gap-2 hover:bg-[#D4AF37]/5 cursor-pointer border-b border-white/5 last:border-0"
                                                                                >
                                                                                    <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}`} className="w-5 h-5 rounded-full object-cover" />
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <p className="font-black text-[9px] truncate">{u.name || u.username}</p>
                                                                                        <p className="text-[7px] text-white/40 truncate">@{u.username}</p>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <input className="bg-[#0F0A05] border border-white/10 rounded p-2 text-white font-medium" placeholder="Equipe" value={line.nome_equipe || ''} onChange={(e) => {
                                                                    const newLines = [...resultLines];
                                                                    newLines[globalIdx].nome_equipe = e.target.value;
                                                                    setResultLines(newLines);
                                                                }} />
                                                                <input className="bg-[#0F0A05] border border-white/10 rounded p-2 text-white font-medium" placeholder="Cavalo" value={line.cavalo || ''} onChange={(e) => {
                                                                    const newLines = [...resultLines];
                                                                    newLines[globalIdx].cavalo = e.target.value;
                                                                    setResultLines(newLines);
                                                                }} />
                                                            </div>
                                                            <button type="button" onClick={() => setResultLines(resultLines.filter(l => l !== line))} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="material-icons text-[10px]">close</span></button>
                                                        </div>
                                                    );
                                                })}
                                                <button type="button" onClick={() => {
                                                    const newLine = { categoria_id: cat.id, colocacao: (resultLines.filter(l => l.categoria_id === cat.id).length + 1) + 'º' };
                                                    setResultLines([...resultLines, newLine]);
                                                }} className="w-full py-2 rounded-xl border border-dashed border-[#D4AF37]/30 text-[9px] font-black uppercase text-[#D4AF37] hover:bg-[#D4AF37]/5 transition-colors">
                                                    + Adicionar Colocação
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Sessão 3: Status */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Publicação</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['rascunho', 'publicado', 'arquivado'].map(st => (
                                        <button key={st} type="button" onClick={() => setResultForm({...resultForm, status: st})} className={`py-3 rounded-xl font-black uppercase text-[9px] tracking-widest border transition-all ${resultForm.status === st ? 'bg-[#1A1108] border-[#1A1108] text-[#D4AF37]' : 'bg-[#1A1108] border-white/10 text-white/40'}`}>
                                            {st}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="w-full bg-[#D4AF37] text-white py-5 rounded-[28px] font-black uppercase tracking-widest shadow-xl shadow-[#D4AF37]/20 active:scale-95 transition-transform flex items-center justify-center gap-3">
                                {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <><span className="material-icons">check_circle</span> Salvar e Publicar</>}
                            </button>

                        </form>
                    </div>
                </div>
            );
        }

        if (subviewResults === 'LIST') {
            return (
                <div className="absolute inset-0 bg-[#0F0A05] flex flex-col z-[120]">
                    <header className="px-6 py-6 border-b border-white/5 flex items-center gap-4 bg-[#0F0A05] sticky top-0 z-10 w-full shadow-sm">
                        <button onClick={() => setSubviewResults('HOME')} className="material-icons text-white active:scale-90">arrow_back</button>
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Lista de Resultados</h2>
                    </header>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {(resultsList || []).length === 0 ? <p className="text-center text-xs opacity-50 py-10 font-bold uppercase tracking-widest">Nenhum resultado registrado.</p> : (resultsList || []).map((res) => (
                            <div key={res.id} className={`bg-[#1A1108] border rounded-[28px] p-5 flex justify-between items-center shadow-sm ${res.status === 'rascunho' ? 'border-orange-200 opacity-80' : 'border-white/10'}`}>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${res.status === 'publicado' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>{res.status}</span>
                                    </div>
                                    <h4 className="font-black text-sm text-white leading-tight uppercase">{res.titulo}</h4>
                                    <p className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-tighter mt-1 italic">Evento: {res.event_title}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { 
                                        setResultForm(res); 
                                        fetchResultDetails(res.id);
                                        setSubviewResults('CREATE'); 
                                    }} className="w-10 h-10 rounded-2xl bg-white/5 text-white/60 flex items-center justify-center active:scale-90 transition-transform">
                                        <span className="material-icons text-lg">edit</span>
                                    </button>
                                    <button onClick={async () => {
                                        if (confirm('Excluir este resultado permanentemente?')) {
                                            const { error } = await supabase.from('resultados').delete().eq('id', res.id);
                                            if (!error) fetchResults();
                                        }
                                    }} className="w-10 h-10 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center active:scale-90 transition-transform">
                                        <span className="material-icons text-lg">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="absolute inset-0 bg-[#0F0A05] flex flex-col z-[120]">
                <header className="px-6 py-6 border-b border-white/5 flex items-center gap-4 bg-[#0F0A05] sticky top-0 z-10 w-full shadow-sm">
                    <button onClick={() => setActiveTab('MAIN')} className="material-icons text-white active:scale-90">arrow_back</button>
                    <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Resultados Oficiais</h2>
                </header>
                <div className="flex-1 overflow-y-auto p-6">
                    <MenuItem icon="add_chart" label="Adicionar Novo Resultado" onClick={() => { 
                        setResultForm({ status: 'rascunho' }); 
                        setResultCategories([]); 
                        setResultLines([]);
                        setSubviewResults('CREATE'); 
                    }} />
                    <MenuItem icon="list_alt" label="Gerenciar Resultados" onClick={() => setSubviewResults('LIST')} badge={resultsList.length || undefined} />
                </div>
            </div>
        );
    };

    const renderNoticiasView = () => {
        if (subviewNews === 'CREATE') {
            return (
                <div className="absolute inset-0 bg-[#0F0A05] flex flex-col z-[120]">
                    <header className="px-6 py-6 border-b border-white/5 flex items-center gap-4 bg-[#0F0A05] sticky top-0 z-10 w-full">
                        <button onClick={() => {
                            if (newsForm.id) setSubviewNews('LIST');
                            else setSubviewNews('HOME');
                        }} className="material-icons text-white active:scale-90 transition-transform">arrow_back</button>
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">{newsForm.id ? "Editar Notícia" : "Criar Notícia"}</h2>
                    </header>
                    <div className="flex-1 overflow-y-auto p-6">
                        <form onSubmit={handleSaveNews} className="space-y-4 pb-20">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Cabeçalho</label>
                                <input className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-sm text-white focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Título da Notícia" required value={newsForm.title || ''} onChange={(e)=>setNewsForm({...newsForm, title: e.target.value})} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <input className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-sm text-white focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Tag Curta (Ex: RESULTADOS)" value={newsForm.tag || ''} onChange={(e)=>setNewsForm({...newsForm, tag: e.target.value})} />
                                <input className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-sm text-white focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Data (Ex: Ontem)" value={newsForm.date || ''} onChange={(e)=>setNewsForm({...newsForm, date: e.target.value})} />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Tipo de Conteúdo</label>
                                <select className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-sm text-white focus:border-[#D4AF37] outline-none shadow-sm appearance-none" value={newsForm.type || 'info'} onChange={(e)=>setNewsForm({...newsForm, type: e.target.value})}>
                                    <option value="info">Geral / Informativo</option>
                                    <option value="important">Urgente / Alerta</option>
                                    <option value="success">Resultado / Festa</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Foto da Notícia</label>
                                <div className="relative aspect-video bg-[#1A1108] border-2 border-dashed border-white/10 rounded-2xl overflow-hidden group">
                                    {newsForm.image_url ? (
                                        <>
                                            <img src={newsForm.image_url} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                                <label className="bg-[#1A1108] text-white p-2 rounded-full cursor-pointer shadow-lg active:scale-90 transition-transform">
                                                    <span className="material-icons text-xl">cached</span>
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleNewsFileUpload(e, 'image')} />
                                                </label>
                                                <button type="button" onClick={() => setNewsForm({...newsForm, image_url: ''})} className="bg-red-500 text-white p-2 rounded-full shadow-lg active:scale-90 transition-transform">
                                                    <span className="material-icons text-xl">delete</span>
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                                            <span className="material-icons text-4xl text-[#D4AF37] mb-2">add_photo_alternate</span>
                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Adicionar Foto</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleNewsFileUpload(e, 'image')} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Anexo PDF</label>
                                    <label className={`w-full h-14 border rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${newsForm.pdf_url ? 'bg-red-50 border-red-200 text-red-600' : 'bg-[#1A1108] border-white/10 text-white/40'}`}>
                                        <span className="material-icons text-xl">{newsForm.pdf_url ? 'picture_as_pdf' : 'attach_file'}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">{newsForm.pdf_url ? 'PDF Pronto' : 'Subir PDF'}</span>
                                        <input type="file" className="hidden" accept="application/pdf" onChange={(e) => handleNewsFileUpload(e, 'pdf')} />
                                        {newsForm.pdf_url && (
                                            <button type="button" onClick={(e) => { e.preventDefault(); setNewsForm({...newsForm, pdf_url: ''}); }} className="ml-2 material-icons text-sm opacity-50 hover:opacity-100">close</button>
                                        )}
                                    </label>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Link Externo</label>
                                    <div className="relative">
                                        <input className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 pl-10 text-sm text-white focus:border-[#D4AF37] outline-none shadow-sm" placeholder="https://..." value={newsForm.external_link || ''} onChange={(e)=>setNewsForm({...newsForm, external_link: e.target.value})} />
                                        <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-lg">link</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Texto da Notícia</label>
                                <textarea className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-sm text-white focus:border-[#D4AF37] outline-none shadow-sm" placeholder="Descrição completa..." rows={6} value={newsForm.description || ''} onChange={(e)=>setNewsForm({...newsForm, description: e.target.value})} />
                            </div>

                            <button type="submit" disabled={loading} className="w-full bg-[#D4AF37] text-white p-5 rounded-2xl font-black uppercase text-xs active:scale-95 transition-transform shadow-xl shadow-[#D4AF37]/20 flex items-center justify-center gap-2 disabled:opacity-50 mt-4">
                                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="material-icons text-sm">publish</span>}
                                {newsForm.id ? "Atualizar Notícia" : "Publicar Notícia"}
                            </button>
                            <button type="button" onClick={()=>setSubviewNews('HOME')} className="w-full bg-transparent text-white/40 p-3 rounded-xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                        </form>
                    </div>
                </div>
            );
        }

        if (subviewNews === 'LIST') {
            return (
                <div className="absolute inset-0 bg-[#0F0A05] flex flex-col z-[120]">
                    <header className="px-6 py-6 border-b border-white/5 flex items-center gap-4 bg-[#0F0A05] sticky top-0 z-10 w-full">
                        <button onClick={() => setSubviewNews('HOME')} className="material-icons text-white active:scale-90 transition-transform">arrow_back</button>
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Lista de Notícias</h2>
                    </header>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {newsList.length === 0 ? <p className="text-center text-xs opacity-50 py-10 font-bold uppercase tracking-widest">Nenhuma notícia registrada.</p> : newsList.map((nw) => (
                            <div key={nw.id} className={`bg-[#1A1108] border rounded-xl p-4 flex justify-between items-center ${nw.is_paused ? 'border-red-300 opacity-50' : 'border-white/10'}`}>
                                <div className="flex-1 pr-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${nw.type === 'urgent' ? 'bg-red-50 text-red-600' : nw.type === 'official' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-neutral-100 text-neutral-500'}`}>{nw.tag}</span>
                                        <span className="text-[10px] font-medium text-white/60">{nw.date}</span>
                                    </div>
                                    <h4 className="font-bold text-sm leading-tight text-white">{nw.title}</h4>
                                    {nw.is_paused && <span className="text-[9px] bg-red-100 text-red-600 px-1 py-0.5 rounded font-black inline-block mt-1">OCULTADA</span>}
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button onClick={() => { setNewsForm(nw); setSubviewNews('CREATE'); }} className="material-icons text-white/60 text-[20px] p-1">edit</button>
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

        if (subviewNews === 'TV') {
            const previewVideoId = extractYouTubeId(transmissionForm.youtube_url || '');
            const previewThumb = transmissionForm.thumbnail_url || (previewVideoId ? `https://img.youtube.com/vi/${previewVideoId}/hqdefault.jpg` : null);

            return (
                <div className="absolute inset-0 bg-[#0F0A05] flex flex-col z-[120]">
                    <header className="px-6 py-5 border-b border-white/5 flex items-center gap-4 bg-gradient-to-r from-[#1A0A05] to-[#2a0a05] sticky top-0 z-10 w-full">
                        <button onClick={() => setSubviewNews('HOME')} className="material-icons text-white/60 active:scale-90 transition-transform">arrow_back</button>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                                <span className="material-icons text-white text-lg">live_tv</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-black uppercase italic tracking-tight text-white">TV +VAQUEJADA</h2>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">Gerenciar Transmissões</p>
                            </div>
                        </div>
                    </header>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">

                        {/* INFO INSTRUCIONAL */}
                        <div className="bg-red-600/10 border border-red-600/20 rounded-2xl p-4 flex gap-3">
                            <span className="material-icons text-red-500 shrink-0 text-lg mt-0.5">info</span>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Como funciona</p>
                                <p className="text-[11px] text-white/70 font-medium leading-relaxed">
                                    Cole o link da live do seu canal YouTube (ou canal autorizado). O app extrai o ID automaticamente, gera a thumbnail e incorpora o player. Ative o badge <span className="font-black text-red-600">AO VIVO</span> para aparecer o indicador piscando no botão.
                                </p>
                            </div>
                        </div>

                        {/* FORMULÁRIO */}
                        <form onSubmit={handleSaveTransmission} className="bg-[#1A1108] p-6 rounded-[32px] border border-white/5 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">{
                                    transmissionForm.id ? 'Editar Transmissão' : '▶ Iniciar Transmissão'
                                }</h3>
                                {transmissionForm.id && (
                                    <span className="text-[9px] font-black text-white/40 uppercase px-2 py-1 bg-white/5 rounded-lg">Modo Edição</span>
                                )}
                            </div>

                            {/* Preview da thumbnail */}
                            {previewThumb && (
                                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/10">
                                    <img src={previewThumb} className="w-full h-full object-cover" alt="Preview" />
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                        <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-xl">
                                            <span className="material-icons text-white text-2xl translate-x-0.5">play_arrow</span>
                                        </div>
                                    </div>
                                    {previewVideoId && (
                                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] font-black text-white font-mono">
                                            ID: {previewVideoId}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-3">
                                <input 
                                    className="w-full bg-white/5 border border-white/5 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-[#D4AF37] placeholder:text-white/30" 
                                    placeholder="Título da Transmissão (ex: Vaquejada de Serrinha 2025)" 
                                    value={transmissionForm.title || ''} 
                                    onChange={(e) => setTransmissionForm({...transmissionForm, title: e.target.value})} 
                                    required 
                                />
                                <div className="relative">
                                    <input 
                                        className="w-full bg-white/5 border border-white/5 rounded-xl p-4 pl-10 text-sm font-bold text-white outline-none focus:border-red-400 placeholder:text-white/30" 
                                        placeholder="Link YouTube (youtube.com/watch?v=... ou youtu.be/...)" 
                                        value={transmissionForm.youtube_url || ''} 
                                        onChange={(e) => setTransmissionForm({...transmissionForm, youtube_url: e.target.value})} 
                                        required 
                                    />
                                    <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-red-500 text-lg">link</span>
                                </div>
                                <input 
                                    className="w-full bg-white/5 border border-white/5 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-[#D4AF37] placeholder:text-white/30" 
                                    placeholder="Canal (ex: +Vaquejada Oficial)" 
                                    value={transmissionForm.channel_name || ''} 
                                    onChange={(e) => setTransmissionForm({...transmissionForm, channel_name: e.target.value})} 
                                />
                                <textarea
                                    className="w-full bg-white/5 border border-white/5 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-[#D4AF37] placeholder:text-white/30 resize-none" 
                                    placeholder="Descrição curta (opcional)" 
                                    rows={2}
                                    value={transmissionForm.description || ''} 
                                    onChange={(e) => setTransmissionForm({...transmissionForm, description: e.target.value})} 
                                />
                            </div>

                            {/* Toggle AO VIVO */}
                            <button
                                type="button"
                                onClick={() => setTransmissionForm({...transmissionForm, is_live: !transmissionForm.is_live})}
                                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                                    transmissionForm.is_live
                                        ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20'
                                        : 'bg-[#1A1108] border-white/10 text-white/60'
                                }`}
                            >
                                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                    transmissionForm.is_live ? 'bg-[#1A1108] border-white' : 'border-white/30'
                                }`}>
                                    {transmissionForm.is_live && <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />}
                                </span>
                                <div className="text-left flex-1">
                                    <p className={`text-xs font-black uppercase tracking-widest ${transmissionForm.is_live ? 'text-white' : 'text-white/60'}`}>
                                        {transmissionForm.is_live ? '🔴 AO VIVO — Badge ativo no app' : 'Marcar como AO VIVO agora'}
                                    </p>
                                    <p className={`text-[9px] font-medium mt-0.5 ${transmissionForm.is_live ? 'text-white/70' : 'text-white/40'}`}>
                                        {transmissionForm.is_live ? 'Badge piscando aparece para todos os usuários' : 'Ative para exibir o indicador de live'}
                                    </p>
                                </div>
                            </button>

                            {/* Declaração de Autorização Obrigatória */}
                            <button
                                type="button"
                                onClick={() => setTransmissionForm({...transmissionForm, authorized: !transmissionForm.authorized})}
                                className="w-full flex items-start gap-4 p-4 bg-white/5 rounded-[20px] border border-white/5 active:scale-[0.98] transition-all text-left"
                            >
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${transmissionForm.authorized ? 'bg-red-600 border-red-600' : 'bg-[#1A1108] border-white/20'}`}>
                                    {transmissionForm.authorized && <span className="material-icons text-white text-lg">check</span>}
                                </div>
                                <p className="text-[11px] text-white/70 font-black leading-tight uppercase tracking-tight">
                                    Declaro que possuo autorização para compartilhar esta transmissão no aplicativo
                                </p>
                            </button>

                            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-red-700 to-red-600 text-white p-5 rounded-2xl font-black uppercase text-sm tracking-widest active:scale-95 transition-transform shadow-xl shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-50">
                                 {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="material-icons">live_tv</span>}
                                 {transmissionForm.id ? 'Atualizar Transmissão' : 'Publicar na TV +Vaquejada'}
                            </button>
                            {transmissionForm.id && (
                                <button type="button" onClick={() => setTransmissionForm({})} className="w-full text-[10px] font-black uppercase tracking-widest text-white/40 py-2">Cancelar Edição</button>
                            )}
                        </form>

                        {/* LISTA DE TRANSMISSÕES */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Transmissões cadastradas</h3>
                                <span className="text-[9px] font-black text-[#D4AF37]">{transmissionsList.length} total</span>
                            </div>

                            {transmissionsList.length === 0 ? (
                                <div className="text-center text-[11px] opacity-40 font-bold py-10 border border-dashed border-white/10 rounded-2xl">
                                    <span className="material-icons text-3xl mb-2 opacity-50">videocam_off</span>
                                    <p>Nenhuma transmissão cadastrada.</p>
                                </div>
                            ) : transmissionsList.map((t) => {
                                const tThumb = t.thumbnail_url || (t.youtube_video_id ? `https://img.youtube.com/vi/${t.youtube_video_id}/hqdefault.jpg` : null);
                                return (
                                    <div key={t.id} className={`bg-[#1A1108] border rounded-2xl overflow-hidden shadow-sm transition-all ${
                                        t.is_live ? 'border-red-400 ring-1 ring-red-400/20' : t.active ? 'border-white/10' : 'border-white/5 opacity-50'
                                    }`}>
                                        <div className="flex items-center gap-3 p-3">
                                            <div className="w-20 h-12 bg-black rounded-xl overflow-hidden flex items-center justify-center relative shrink-0">
                                                {tThumb ? <img src={tThumb} className="w-full h-full object-cover" alt={t.title} /> : <span className="material-icons text-white/20">live_tv</span>}
                                                {t.is_live && <div className="absolute inset-0 flex items-end p-1"><span className="text-[8px] font-black bg-red-600 text-white px-1 rounded flex items-center gap-0.5"><span className="w-1 h-1 bg-[#1A1108] rounded-full animate-pulse" />LIVE</span></div>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-black uppercase text-white leading-tight truncate">{t.title}</p>
                                                <p className="text-[9px] font-bold text-[#D4AF37] truncate mt-0.5">{t.channel_name || '+Vaquejada'}</p>
                                                <p className="text-[8px] text-white/30 truncate font-mono">{t.youtube_url}</p>
                                            </div>
                                            <div className="flex flex-col gap-1 shrink-0">
                                                <button onClick={() => setTransmissionForm(t)} className="w-7 h-7 rounded-lg bg-white/5 text-white flex items-center justify-center hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] transition-all">
                                                    <span className="material-icons text-sm">edit</span>
                                                </button>
                                                <button onClick={() => toggleTransmissionStatus(t.id, t.active)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${t.active ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-400'}`}>
                                                    <span className="material-icons text-sm">{t.active ? 'visibility' : 'visibility_off'}</span>
                                                </button>
                                                <button onClick={() => deleteTransmission(t.id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                                                    <span className="material-icons text-sm">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="absolute inset-0 bg-[#0F0A05] flex flex-col z-[120]">
                <SubHeader title="Arena Notícias" />
                <div className="flex-1 overflow-y-auto">
                    <SectionTitle title="Módulo TV" />
                    <div className="px-6 mb-8">
                        <button 
                            onClick={() => setSubviewNews('TV')}
                            className="w-full bg-gradient-to-br from-red-600 to-red-800 p-6 rounded-3xl shadow-xl shadow-red-900/20 active:scale-95 transition-all flex items-center gap-4 group"
                        >
                            <div className="w-12 h-12 bg-[#1A1108]/20 rounded-2xl flex items-center justify-center">
                                <span className="material-icons text-white text-2xl group-hover:scale-110 transition-transform">live_tv</span>
                            </div>
                            <div className="text-left">
                                <h4 className="text-white font-black uppercase text-lg italic leading-none tracking-tighter">TV +VAQUEJADA</h4>
                                <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest mt-1">Gerenciar Transmissões Youtube</p>
                            </div>
                            <span className="material-icons text-white/40 ml-auto">settings</span>
                        </button>
                    </div>

                    <SectionTitle title="Gestão de Notícias" />
                    <div className="px-6 grid grid-cols-2 gap-3 mb-6">
                        <button onClick={()=>{ setNewsForm({ type: 'info' }); setSubviewNews('CREATE'); }} className="bg-[#D4AF37] text-white p-4 rounded-xl font-black uppercase tracking-widest text-[10px] flex flex-col items-center gap-2 active:scale-95 shadow-sm">
                            <span className="material-icons">post_add</span>
                            Criar Notícia
                        </button>
                        <button onClick={()=>{ setSubviewNews('LIST'); }} className="bg-[#1A1108] border border-white/10 text-white p-4 rounded-xl font-black uppercase tracking-widest text-[10px] flex flex-col items-center gap-2 active:scale-95">
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
    if (activeTab === 'RESULTADOS') return renderResultadosView();
    if (activeTab === 'MASTER') return <AdminMasterView user={user} onBack={() => setActiveTab('MAIN')} />;
    if (activeTab === 'ADS') return <AdminAdsManager user={user} onBack={() => setActiveTab('MAIN')} />;


    return (
        <div className="min-h-full bg-[#0F0A05] text-white font-sans pb-24 font-display animate-in slide-in-from-right duration-300 z-[150] relative">
            <header className="px-6 py-6 border-b border-white/5 flex items-center gap-4 bg-[#0F0A05] sticky top-0 z-10 w-full shadow-sm">
                <button onClick={() => window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view: View.SETTINGS } }))} className="material-icons text-white active:scale-90">arrow_back</button>
                <div className="flex-1 text-center pr-8">
                    <h2 className="text-xl font-black uppercase italic tracking-tight text-[#D4AF37]">ADM Geral</h2>
                    <p className="text-[10px] font-black tracking-widest uppercase text-white/40">Painel Operacional</p>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto">
                <div className="p-6 pb-2 m-4 bg-[#D4AF37]/5 rounded-2xl border border-[#D4AF37]/20 flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-[#D4AF37]/20 rounded-full flex items-center justify-center shrink-0">
                        <span className="material-icons text-[#D4AF37]">shield</span>
                    </div>
                    <div>
                        <h4 className="font-black text-sm uppercase tracking-wide">Conta Administrativa</h4>
                        <p className="text-[10px] font-medium leading-tight text-white/60 mt-0.5">
                            {isMaster ? 'Acesso Global Ilimitado autorizado.' : 'Acesso Modular autorizado pelo Mestre.'}
                        </p>
                    </div>
                </div>

                {isMaster && (
                    <div className="mb-8">
                        <SectionTitle title="Inteligência & Gestão" />
                        <div className="bg-gradient-to-r from-[#D4AF37] to-[#1A1108] mx-4 rounded-[32px] p-6 shadow-xl relative overflow-hidden group active:scale-95 transition-transform cursor-pointer" onClick={() => setActiveTab('MASTER')}>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-[#D4AF37]/30 transition-colors" />
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-12 h-12 bg-[#D4AF37] rounded-2xl flex items-center justify-center shadow-lg shadow-[#D4AF37]/20">
                                    <span className="material-icons text-white">insights</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-white font-black uppercase italic tracking-tighter leading-none mb-1">Painel Master</h3>
                                    <p className="text-[#D4AF37] text-[10px] font-black uppercase tracking-widest">Controle Global & Métricas</p>
                                </div>
                                <span className="material-icons text-white/20">chevron_right</span>
                            </div>
                            <div className="mt-4 flex gap-2 overflow-hidden relative z-10">
                                <span className="text-[8px] bg-[#1A1108]/10 text-white/60 px-2 py-1 rounded-full uppercase font-black">Auditoria</span>
                                <span className="text-[8px] bg-[#1A1108]/10 text-white/60 px-2 py-1 rounded-full uppercase font-black">Analytics</span>
                                <span className="text-[8px] bg-[#1A1108]/10 text-white/60 px-2 py-1 rounded-full uppercase font-black">Segurança</span>
                            </div>
                        </div>
                    </div>
                )}

                <SectionTitle title="Superusuário" />
                        <MenuItem 
                            icon="group" 
                            label="Comunidade & Usuários" 
                            badge={totalUsersCount ? totalUsersCount.toLocaleString() : undefined} 
                            onClick={() => setActiveTab('USERS')} 
                        />
                        <MenuItem 
                            icon="campaign" 
                            label="Central de Publicidade" 
                            onClick={() => setActiveTab('ADS')} 
                        />
                        <MenuItem 
                            icon="view_day" 
                            label="Midia Interna (Feed)" 
                            onClick={() => window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view: View.INTERNAL_ADS } }))} 
                        />

                        {/* Trocar Fundo de Login */}
                        <div className="mx-4 mb-4">
                            <div className="bg-[#1A1108] border border-white/10 rounded-[28px] overflow-hidden shadow-sm">
                                <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
                                    <div className="w-9 h-9 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center">
                                        <span className="material-icons text-[#D4AF37] text-lg">wallpaper</span>
                                    </div>
                                    <div>
                                        <p className="font-black text-sm text-white leading-tight">Trocar Fundo de Login</p>
                                        <p className="text-[9px] text-white/40 uppercase tracking-widest">Imagem de fundo da tela inicial</p>
                                    </div>
                                </div>
                                <div className="p-5 space-y-4">
                                    {loginBgUrl ? (
                                        <div className="relative rounded-2xl overflow-hidden aspect-[9/16] w-28 border border-white/10 shadow-md">
                                            <img src={loginBgUrl} className="w-full h-full object-cover" alt="Fundo atual" />
                                            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-[#0F0A05]/80" />
                                            <span className="absolute bottom-2 left-2 text-[7px] font-black text-white/60 uppercase tracking-widest">Atual</span>
                                        </div>
                                    ) : (
                                        <div className="w-28 aspect-[9/16] bg-neutral-100 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center">
                                            <span className="material-icons text-white/20 text-3xl">image</span>
                                        </div>
                                    )}
                                    <label className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest cursor-pointer transition-all border ${
                                        loginBgUploading
                                            ? 'bg-neutral-100 border-neutral-200 text-white/30'
                                            : 'bg-[#D4AF37] border-[#D4AF37] text-white active:scale-95 shadow-md shadow-[#D4AF37]/20'
                                    }`}>
                                        {loginBgUploading
                                            ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" /> Enviando...</>
                                            : <><span className="material-icons text-base">upload</span> {loginBgUrl ? 'Trocar Imagem' : 'Annexar Imagem'}</>
                                        }
                                        <input type="file" className="hidden" accept="image/*" onChange={handleLoginBgUpload} disabled={loginBgUploading} />
                                    </label>
                                    <p className="text-[9px] text-white/30 text-center font-bold uppercase tracking-widest">O efeito escuro é aplicado automaticamente</p>
                                </div>
                            </div>
                        </div>

                {(hasMercado || hasSocial || hasEventos || hasNoticias) && <SectionTitle title="Módulos Interligados" />}

                
                {hasMercado && <MenuItem icon="storefront" label="Mercado Oficial" onClick={() => { setSubviewMercado('HOME'); setActiveTab('MERCADO'); }} />}
                
                {hasSocial && <MenuItem icon="pets" label="+Vaquejada" onClick={() => { setSubviewSocial('HOME'); setActiveTab('SOCIAL'); }} />}
                
                {hasEventos && <MenuItem icon="emoji_events" label="Vaquejadas" onClick={() => { setSubviewEvents('HOME'); setActiveTab('EVENTOS'); }} />}
                
                {hasNoticias && <MenuItem icon="campaign" label="Arena Notícias" onClick={() => { setSubviewNews('HOME'); setActiveTab('NOTICIAS'); }} />}
                
                {hasEventos && <MenuItem icon="leaderboard" label="Resultados Oficiais" onClick={() => { setSubviewResults('HOME'); setActiveTab('RESULTADOS'); }} />}
                
                <div className="py-20 opacity-20 flex flex-col items-center">
                    <span className="material-icons text-4xl mb-2">admin_panel_settings</span>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Sistema Restrito</p>
                </div>
            </div>

            {loading && (
                <div className="fixed inset-0 bg-[#1A1108]/60 backdrop-blur-sm flex items-center justify-center z-[300]">
                    <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
};

export default AdminView;
