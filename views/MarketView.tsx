import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View } from '../types';
import { supabase } from '../lib/supabase';
import AdsCarousel from '../components/AdsCarousel';
import { compressImage } from '../lib/imageUtils';
import GuestCTA from '../components/GuestCTA';
import { PullToRefresh } from '../components/PullToRefresh';

const STATES = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const CATEGORIES = {
    'ANIMAIS': ['Cavalo', 'Boi', 'Bode', 'Vaca', 'Bezerro', 'Garrote', 'Touro', 'Jumento', 'Burro', 'Mula'],
    'ALIMENTACAO': ['Ração', 'Feno', 'Silagem', 'Milho', 'Sal Mineral', 'Suplemento', 'Leite'],
    'EQUIPAMENTOS': ['Sela', 'Arreio', 'Manta', 'Cabeçada', 'Acessórios', 'Ferramentas'],
    'VEICULOS': ['Caminhão', 'Reboque', 'Trailer', 'Carreta', 'Máquinas'],
    'SERVICOS': ['Frete', 'Veterinário', 'Ferrador', 'Doma', 'Treinamento'],
    'OUTROS': ['Ingressos', 'Senhas', 'Camarotes', 'Outro']
};

interface MarketViewProps {
    user: any;
    forceShowWizard?: boolean;
    onWizardClose?: () => void;
    onViewChange?: (view: View) => void;
    selectedStore?: any;
}

const MarketView: React.FC<MarketViewProps> = ({ user, forceShowWizard = false, onWizardClose, onViewChange, selectedStore }) => {
    const [showCreateWizard, setShowCreateWizard] = useState(forceShowWizard);
    
    useEffect(() => setShowCreateWizard(forceShowWizard), [forceShowWizard]);

    const [step, setStep] = useState(1);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [viewingAd, setViewingAd] = useState<any>(null);
    const [favorites, setFavorites] = useState<string[]>(() => {
        const saved = localStorage.getItem('arena_market_favorites');
        return saved ? JSON.parse(saved) : [];
    });
    const [fullscreenGallery, setFullscreenGallery] = useState<{photos: string[], index: number} | null>(null);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);
    const [publishedAds, setPublishedAds] = useState<any[]>([]);
    const [loadingAds, setLoadingAds] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [stores, setStores] = useState<any[]>([]);
    const [loadingStores, setLoadingStores] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilterCat, setActiveFilterCat] = useState('all');
    const [sortOrder, setSortOrder] = useState<'recent' | 'lowest' | 'highest' | 'most_viewed'>('recent');
    
    // Form State
    const [adData, setAdData] = useState({
        category: '',
        customCategory: '',
        subcategory: '',
        customSubcategory: '',
        title: '',
        description: '',
        priceType: 'fixed' as 'fixed' | 'negotiable',
        price: '',
        uf: '',
        city: '',
        photos: [] as string[],
        metadata: {} as any, // dynamic fields go here
        product_type: 'normal' // normal, ingresso, senha
    });

    const [cities, setCities] = useState<any[]>([]);
    const [loadingCities, setLoadingCities] = useState(false);

    useEffect(() => {
        if (adData.uf) {
            setLoadingCities(true);
            fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${adData.uf}/municipios?orderBy=nome`)
                .then(res => res.json())
                .then(data => { setCities(data); setLoadingCities(false); })
                .catch(err => { console.error(err); setLoadingCities(false); });
        } else {
            setCities([]);
            setAdData(prev => ({ ...prev, city: '' }));
        }
    }, [adData.uf]);

    useEffect(() => {
        localStorage.setItem('arena_market_favorites', JSON.stringify(favorites));
    }, [favorites]);

    const fetchAds = async () => {
        setLoadingAds(true);
        try {
            const { data, error } = await supabase
                .from('market_items')
                .select('*, profiles:user_id(name, avatar_url, username), lojas:loja_id(id, nome, verificado, logo_url, banner_url, whatsapp, instagram, cidade, estado)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPublishedAds(data || []);
        } catch (err) {
            console.error('Error fetching ads:', err);
        } finally {
            setLoadingAds(false);
        }
    };

    const fetchStores = async () => {
        setLoadingStores(true);
        try {
            const { data, error } = await supabase
                .from('lojas')
                .select('*')
                .eq('ativo', true)
                .order('verificado', { ascending: false });
            if (error) throw error;
            setStores(data || []);
        } catch (err) {
            console.error('Error fetching stores:', err);
        } finally {
            setLoadingStores(false);
        }
    };

    const handleRefresh = async () => {
        await Promise.all([fetchAds(), fetchStores()]);
    };

    useEffect(() => {
        handleRefresh();
        const channel = supabase.channel('market_items_rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'market_items' }, fetchAds)
            .subscribe();
        
        const storeChannel = supabase.channel('lojas_rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'lojas' }, fetchStores)
            .subscribe();

        return () => { 
            supabase.removeChannel(channel); 
            supabase.removeChannel(storeChannel);
        };
    }, []);

    const deleteAdDirectly = async (ad: any) => {
        if (!confirm(`Deseja EXCLUIR permanentemente o anúncio "${ad.title}"?`)) return;
        try {
            const { error: delError } = await supabase.from('market_items').delete().eq('id', ad.id);
            if (delError) throw delError;
            
            const isAdmin = user?.role === 'ADMIN' || user?.role === 'ADMIN_MASTER' || user?.isMaster;
            if (isAdmin && ad.user_id !== user.id) {
                await supabase.from('notifications').insert({
                    user_id: ad.user_id,
                    actor_id: user.id,
                    type: 'system',
                    message: `O +Vaquejada retirou do mercado o seu produto "${ad.title}" por não condizer com a política do aplicativo.`
                });
            }
            alert('Anúncio removido com sucesso!');
            fetchAds();
        } catch (err: any) {
            alert('Erro ao excluir: ' + err.message);
        }
    };

    const toggleFavorite = (title: string) => {
        setFavorites(prev => prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]);
    };

    const navigateToProfile = (username: string) => {
        window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view: 'PROFILE', username } }));
    };

    const handleRealPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                let fileToUpload: File | Blob = file;
                if (file.type.startsWith('image/')) {
                    try { fileToUpload = await compressImage(file); } catch (e) { console.warn(e); }
                }

                const fileExt = file.name.split('.').pop();
                const fileName = `market/${user.id}/${Date.now()}_${i}.${fileExt}`;
                
                const arrayBuffer = await fileToUpload.arrayBuffer();
                const { error: uploadError } = await supabase.storage.from('vaquejadas').upload(fileName, arrayBuffer, {
                    contentType: file.type,
                    upsert: true
                });
                if (uploadError) continue;

                const { data: { publicUrl } } = supabase.storage.from('vaquejadas').getPublicUrl(fileName);
                setAdData(prev => ({ ...prev, photos: [...prev.photos, publicUrl] }));
            }
        } catch (error: any) {
            alert("Erro ao processar fotos: " + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const publishAd = async () => {
        if (!user?.id) return alert("Erro: Usuário não identificado.");
        if (!adData.title || !adData.category) return alert("Por favor, preencha o título e selecione uma categoria.");

        const finalCategory = adData.category === 'OUTROS' ? (adData.customCategory || 'OUTROS') : adData.category;
        const finalSubcat = adData.subcategory === 'Outro' ? adData.customSubcategory : adData.subcategory;

        // Find if user has an active store to link
        let storeId = null;
        try {
            const { data: userStore } = await supabase
                .from('stores')
                .select('id')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .maybeSingle();
            if (userStore) storeId = userStore.id;
        } catch (e) { console.error("Error finding user store:", e); }

        const newItem = {
            user_id: user.id, 
            title: adData.title.trim().toUpperCase(),
            description: adData.description.trim(),
            category: finalCategory.toUpperCase(),
            subcategory: finalSubcat?.toUpperCase() || null,
            price: adData.priceType === 'negotiable' ? 'A COMBINAR' : `R$ ${adData.price}`,
            price_type: adData.priceType,
            loc: `${adData.city || 'Não informada'}, ${adData.uf || '??'}`,
            city: adData.city || '',
            uf: adData.uf || '',
            img: adData.photos[0] || '',
            photos: adData.photos,
            status: 'approved',
            metadata: adData.metadata,
            product_type: adData.product_type,
            store_id: storeId
        };

        try {
            const { error: dbError } = await supabase.from('market_items').insert(newItem);
            if (dbError) throw dbError;
            
            setShowConfirm(false);
            setShowSuccess(true);
            setStep(1);
            setAdData({ category: '', customCategory: '', subcategory: '', customSubcategory: '', title: '', description: '', priceType: 'fixed', price: '', uf: '', city: '', photos: [], metadata: {}, product_type: 'normal' });
            fetchAds();
        } catch (err: any) {
            alert(`Erro ao publicar anúncio: ${err.message}`);
        }
    };

    const handleCloseWizard = () => {
        if (onWizardClose) onWizardClose();
        else setShowCreateWizard(false);
    };

    // Filter Logic
    const filteredAds = useMemo(() => {
        let result = [...publishedAds];

        // 1. Filter by category
        if (activeFilterCat !== 'all') {
            result = result.filter(ad => {
                const cat = (ad.category || '').toUpperCase();
                const sub = (ad.subcategory || '').toUpperCase();
                const title = (ad.title || '').toUpperCase();
                
                if (activeFilterCat === 'CAVALOS') {
                    return cat === 'ANIMAIS' && (sub.includes('CAVALO') || title.includes('CAVALO') || title.includes('POTRO') || title.includes('ÉGUA'));
                }
                if (activeFilterCat === 'CAMINHÕES') {
                    // Inclui veículos pesados e acessórios de transporte
                    return cat === 'VEICULOS' || sub.includes('CAMINHÃO') || sub.includes('REBOQUE') || sub.includes('TRAILER');
                }
                if (activeFilterCat === 'ARREIOS') {
                    return cat === 'EQUIPAMENTOS' && (sub.includes('ARREIO') || sub.includes('SELA') || sub.includes('MANTA') || sub.includes('CABEÇADA'));
                }
                if (activeFilterCat === 'ACESSÓRIOS') {
                    return cat === 'EQUIPAMENTOS' && (sub.includes('ACESSÓRIO') || sub.includes('FERRAMENTA') || (!sub.includes('ARREIO') && !sub.includes('SELA')));
                }
                if (activeFilterCat === 'ANIMAIS') {
                    // Outros animais, excluindo cavalos para manter a organização
                    return cat === 'ANIMAIS' && !(sub.includes('CAVALO') || title.includes('CAVALO') || title.includes('POTRO') || title.includes('ÉGUA'));
                }
                if (activeFilterCat === 'OUTROS') {
                    return cat === 'OUTROS' || cat === 'SERVICOS' || cat === 'ALIMENTACAO';
                }
                
                return cat === activeFilterCat;
            });
        }

        // Filter by store if selected
        if (selectedStore) {
            result = result.filter(ad => ad.loja_id === selectedStore.id || ad.store_id === selectedStore.id);
        }

        // 2. Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(ad => 
                ad.title?.toLowerCase().includes(term) || 
                ad.description?.toLowerCase().includes(term) || 
                ad.category?.toLowerCase().includes(term) || 
                ad.subcategory?.toLowerCase().includes(term)
            );
        }

        // 3. Sort
        result.sort((a, b) => {
            if (sortOrder === 'recent') {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            if (sortOrder === 'lowest' || sortOrder === 'highest') {
                // Parse price strings like "R$ 1.500,00" to numbers
                const getPriceNum = (p: string) => {
                    if (!p || p === 'A COMBINAR') return sortOrder === 'lowest' ? 999999999 : 0;
                    return parseFloat(p.replace(/[^0-9,-]+/g, "").replace(",", "."));
                };
                const pA = getPriceNum(a.price);
                const pB = getPriceNum(b.price);
                return sortOrder === 'lowest' ? pA - pB : pB - pA;
            }
            if (sortOrder === 'most_viewed') {
                // Mock since we don't have views count yet, fallback to likes/random or id
                return (b.id || '').localeCompare(a.id || '');
            }
            return 0;
        });

        return result;
    }, [publishedAds, activeFilterCat, searchTerm, selectedStore, sortOrder]);


    // ==========================================
    // RENDER: VIEW AD
    // ==========================================
    if (viewingAd) {
        const seller = viewingAd.profiles || { name: 'Vendedor', username: 'vendedor', avatar_url: '' };
        const store = viewingAd.lojas; // Base para Módulo 2
        const isOwnerOrAdmin = user?.id === viewingAd.user_id || user?.role === 'ADMIN' || user?.role === 'ADMIN_MASTER' || user?.isMaster;

        return (
            <div className="absolute inset-0 z-[100] bg-[#0F0A05] flex flex-col animate-in slide-in-from-right duration-300">
                <div className="flex-1 overflow-y-auto pb-32 hide-scrollbar">
                    {/* 1. HERO IMAGE PREMIUM */}
                    <div className="relative">
                        {/* Action Buttons Top */}
                        <div className="absolute top-8 left-6 z-20 flex gap-3">
                            <button onClick={() => setViewingAd(null)} className="w-12 h-12 rounded-full bg-[#0F0A05]/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-transform active:scale-90">
                                <span className="material-icons">arrow_back</span>
                            </button>
                        </div>
                        <div className="absolute top-8 right-6 z-20 flex gap-3">
                            {isOwnerOrAdmin && (
                                <button onClick={async () => { await deleteAdDirectly(viewingAd); setViewingAd(null); }} className="w-12 h-12 rounded-full bg-red-500/40 backdrop-blur-md flex items-center justify-center text-white border border-red-500/50 shadow-lg active:scale-90">
                                    <span className="material-icons text-xl">delete</span>
                                </button>
                            )}
                            <button onClick={() => {
                                if (navigator.share) navigator.share({ title: viewingAd.title, url: window.location.href });
                            }} className="w-12 h-12 rounded-full bg-[#0F0A05]/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-transform active:scale-90">
                                <span className="material-icons">share</span>
                            </button>
                        </div>

                        <div className="h-[55vh] relative bg-[#1A1108] group overflow-hidden rounded-b-[40px] shadow-2xl">
                            {Array.isArray(viewingAd.photos) && viewingAd.photos.length > 1 ? (
                                <div className="flex w-full h-full overflow-x-auto snap-x snap-mandatory hide-scrollbar" onScroll={(e: any) => setCurrentPhotoIdx(Math.round(e.target.scrollLeft / e.target.offsetWidth))}>
                                    {viewingAd.photos.map((ph: string, idx: number) => (
                                        <div key={idx} className="w-full h-full shrink-0 snap-center relative" onClick={() => setFullscreenGallery({ photos: viewingAd.photos, index: idx })}>
                                            <img src={ph} className="w-full h-full object-cover" alt="Preview" />
                                        </div>
                                    ))}
                                    <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-[#0F0A05]/40 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                                        {viewingAd.photos.map((_: any, idx: number) => (
                                            <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === currentPhotoIdx ? 'bg-[#D4AF37] w-4 shadow-[0_0_8px_#D4AF37]' : 'bg-white/40'}`} />
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <img src={viewingAd.img || viewingAd.photos?.[0]} className="w-full h-full object-cover" onClick={() => setFullscreenGallery({ photos: viewingAd.photos?.length ? viewingAd.photos : [viewingAd.img || ''], index: 0 })} alt="Preview" />
                            )}
                            {/* Cinematic Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0F0A05] via-[#0F0A05]/20 to-transparent pointer-events-none"></div>
                            
                            <div className="absolute bottom-8 left-6 right-6">
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <span className="bg-[#D4AF37] text-[#0F0A05] text-[9px] font-black px-3 py-1 rounded shadow-lg uppercase tracking-widest">DESTAQUE</span>
                                    {viewingAd.product_type === 'ingresso' && <span className="bg-blue-600/90 backdrop-blur-sm text-white text-[9px] font-black px-3 py-1 rounded shadow-lg uppercase tracking-widest border border-blue-400/30">INGRESSO</span>}
                                    {store?.verificado && <span className="bg-[#0F0A05]/60 backdrop-blur-sm text-[#D4AF37] text-[9px] font-black px-3 py-1 rounded border border-[#D4AF37]/50 shadow-lg uppercase tracking-widest flex items-center gap-1">
                                        <span className="material-icons text-[10px]">verified</span> OFICIAL
                                    </span>}
                                </div>
                                <h1 className="text-white text-4xl font-black uppercase leading-none drop-shadow-2xl">{viewingAd.title}</h1>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 pt-6 space-y-6">
                        {/* 3. CARD PREMIUM DE PREÇO E LOCALIZAÇÃO */}
                        <div className="bg-[#1A1108]/80 backdrop-blur-xl p-5 rounded-3xl border border-white/5 shadow-2xl flex justify-between items-center relative overflow-hidden">
                            <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-2xl"></div>
                            <div>
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">VALOR DO INVESTIMENTO</p>
                                <p className="text-4xl font-black text-[#D4AF37] tracking-tight drop-shadow-md">{viewingAd.price}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 text-right">
                                <div className="flex items-center gap-1.5 text-white/50 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                                    <span className="material-icons text-[12px] text-[#D4AF37]">place</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wide">{viewingAd.loc}</span>
                                </div>
                            </div>
                        </div>

                        {/* 4. CARD DO VENDEDOR */}
                        {store ? (
                            <div className="bg-gradient-to-r from-[#1A1108] to-[#1A1108]/80 p-4 rounded-3xl border border-[#D4AF37]/20 shadow-lg flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                                        <img src={store.logo_url || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <p className="text-sm font-black uppercase text-white tracking-wide">{store.nome}</p>
                                            <span className="material-icons text-[12px] text-[#D4AF37]">verified</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[#D4AF37]/80">
                                            <span className="material-icons text-[10px]">store</span>
                                            <p className="text-[9px] font-black uppercase tracking-widest">Loja Oficial Parceira</p>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => {
                                    window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view: 'STORE_DETAILS', store: store } }));
                                }} className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-[#0F0A05] transition-colors border border-[#D4AF37]/30">
                                    <span className="material-icons text-xl">arrow_forward</span>
                                </button>
                            </div>
                        ) : (
                            <div className="bg-[#1A1108] p-4 rounded-3xl border border-white/5 shadow-lg flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div onClick={() => navigateToProfile(seller.username)} className="w-14 h-14 rounded-full bg-[#0F0A05] overflow-hidden border border-white/10 cursor-pointer">
                                        <img src={seller.avatar_url || `https://ui-avatars.com/api/?name=${seller.name}&background=random`} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <p onClick={() => navigateToProfile(seller.username)} className="text-sm font-black uppercase text-white cursor-pointer hover:text-[#D4AF37] transition-colors">{seller.name || 'Anunciante'}</p>
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mt-0.5">Vendedor</p>
                                    </div>
                                </div>
                                <button onClick={() => navigateToProfile(seller.username)} className="text-[9px] font-black text-white/60 uppercase tracking-widest border border-white/10 px-4 py-2 rounded-xl hover:bg-white/5 transition-colors">Ver Perfil</button>
                            </div>
                        )}

                        {/* 6. INFORMAÇÕES DO ANIMAL / DETALHES GRID PREMIUM */}
                        <div className="bg-[#1A1108]/50 rounded-3xl p-5 border border-white/5">
                            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <span className="material-icons text-[14px] text-[#D4AF37]">info</span>
                                Ficha Técnica
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div className="bg-[#0F0A05] p-3.5 rounded-2xl border border-white/5 flex flex-col justify-center">
                                    <span className="material-icons text-white/20 text-lg mb-2">category</span>
                                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-0.5">CATEGORIA</p>
                                    <p className="text-xs font-bold text-white truncate">{viewingAd.category}</p>
                                </div>
                                {viewingAd.subcategory && (
                                    <div className="bg-[#0F0A05] p-3.5 rounded-2xl border border-white/5 flex flex-col justify-center">
                                        <span className="material-icons text-white/20 text-lg mb-2">sell</span>
                                        <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-0.5">TIPO</p>
                                        <p className="text-xs font-bold text-white truncate">{viewingAd.subcategory}</p>
                                    </div>
                                )}
                                {/* Dynamic Metadata Fields */}
                                {viewingAd.metadata && Object.entries(viewingAd.metadata).map(([key, val]: any) => {
                                    if (!val) return null;
                                    const ICONS: any = { estado_uso: 'handyman', sexo: 'male', raca: 'pets', ano: 'calendar_month', marca: 'stars' };
                                    const labels: any = { estado_uso: 'CONDIÇÃO', sexo: 'SEXO', raca: 'RAÇA', ano: 'ANO', marca: 'MARCA' };
                                    const label = labels[key] || key.toUpperCase();
                                    const icon = ICONS[key] || 'label';
                                    return (
                                        <div key={key} className="bg-[#0F0A05] p-3.5 rounded-2xl border border-white/5 flex flex-col justify-center">
                                            <span className="material-icons text-[#D4AF37]/50 text-lg mb-2">{icon}</span>
                                            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-0.5">{label}</p>
                                            <p className="text-xs font-bold text-white truncate">{String(val).toUpperCase()}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* 5. DESCRIÇÃO */}
                        <div className="bg-[#1A1108]/50 rounded-3xl p-6 border border-white/5">
                            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <span className="material-icons text-[14px] text-[#D4AF37]">description</span>
                                Descrição
                            </h3>
                            <p className="text-sm text-white/80 leading-relaxed font-medium whitespace-pre-wrap">
                                {viewingAd.description || 'Sem descrição.'}
                            </p>
                        </div>

                        {/* 7. MINI GALERIA PREMIUM */}
                        {Array.isArray(viewingAd.photos) && viewingAd.photos.length > 1 && (
                            <div className="pt-2">
                                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Galeria de Fotos</h3>
                                <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-4">
                                    {viewingAd.photos.map((ph: string, idx: number) => (
                                        <div 
                                            key={`thumb-${idx}`} 
                                            onClick={() => setFullscreenGallery({ photos: viewingAd.photos, index: idx })}
                                            className="w-24 h-24 shrink-0 rounded-2xl overflow-hidden border border-white/10 relative group cursor-pointer"
                                        >
                                            <img src={ph} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Thumbnail" />
                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Espaçamento extra para não colar na navbar fixa */}
                        <div className="h-10"></div>
                    </div>
                </div>

                {/* 8. BARRA INFERIOR FIXA (Com buraco no meio para a Casinha Global) */}
                <div className="absolute bottom-0 left-0 right-0 p-4 pb-8 bg-gradient-to-t from-[#0F0A05] via-[#0F0A05]/95 to-transparent flex justify-between items-end z-40 pointer-events-none">
                    {/* Botão Favorito - Esquerda */}
                    <div className="w-[30%] flex justify-start pointer-events-auto">
                        <button onClick={() => toggleFavorite(viewingAd.title)} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all backdrop-blur-md border ${favorites.includes(viewingAd.title) ? 'bg-[#1A1108] border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] text-red-500' : 'bg-[#1A1108]/80 border-white/10 text-white/40 hover:text-white'}`}>
                            <span className="material-icons text-2xl">{favorites.includes(viewingAd.title) ? 'favorite' : 'favorite_border'}</span>
                        </button>
                    </div>

                    {/* Espaço Vazio Central (Aprox 80-100px para a casinha flutuante global) */}
                    <div className="w-[20%] max-w-[100px] h-14"></div>

                    {/* Botão Chat - Direita */}
                    <div className="flex-1 flex justify-end pointer-events-auto">
                        <button
                            onClick={() => window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view: 'SOCIAL', openDM: seller.username } }))}
                            className="w-full max-w-[200px] h-14 bg-gradient-to-r from-[#D4AF37] to-[#AA8A2E] text-[#0F0A05] rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest shadow-[0_0_20px_rgba(212,175,55,0.3)] active:scale-95 transition-transform border border-white/20 relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                            <span className="material-icons text-xl relative z-10">forum</span>
                            <span className="text-[10px] relative z-10 mt-0.5">Falar no Chat</span>
                        </button>
                    </div>
                </div>

                {/* FULLSCREEN GALLERY PREMIUM */}
                {fullscreenGallery && (
                    <div 
                        className="fixed inset-0 z-[1000] bg-[#0F0A05]/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-300" 
                        onClick={() => setFullscreenGallery(null)}
                        onTouchStart={(e) => setTouchStart(e.targetTouches[0].clientX)}
                        onTouchEnd={(e) => {
                            if (touchStart === null) return;
                            const distance = touchStart - e.changedTouches[0].clientX;
                            if (distance > 50) { e.stopPropagation(); setFullscreenGallery(prev => prev ? {...prev, index: (prev.index + 1) % prev.photos.length} : null); } 
                            else if (distance < -50) { e.stopPropagation(); setFullscreenGallery(prev => prev ? {...prev, index: (prev.index - 1 + prev.photos.length) % prev.photos.length} : null); }
                            setTouchStart(null);
                        }}
                    >
                        <button onClick={() => setFullscreenGallery(null)} className="absolute top-12 right-6 w-12 h-12 rounded-full bg-[#1A1108]/80 text-white flex items-center justify-center z-[1010] border border-white/10 active:scale-90"><span className="material-icons">close</span></button>
                        
                        {fullscreenGallery.photos.length > 1 && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); setFullscreenGallery(prev => prev ? {...prev, index: (prev.index - 1 + prev.photos.length) % prev.photos.length} : null) }} className="absolute left-4 top-1/2 -translate-y-1/2 text-white w-12 h-12 flex items-center justify-center bg-[#1A1108]/80 rounded-full z-[1010] border border-white/10 active:scale-90"><span className="material-icons">chevron_left</span></button>
                                <button onClick={(e) => { e.stopPropagation(); setFullscreenGallery(prev => prev ? {...prev, index: (prev.index + 1) % prev.photos.length} : null) }} className="absolute right-4 top-1/2 -translate-y-1/2 text-white w-12 h-12 flex items-center justify-center bg-[#1A1108]/80 rounded-full z-[1010] border border-white/10 active:scale-90"><span className="material-icons">chevron_right</span></button>
                            </>
                        )}
                        
                        <div className="w-full h-full flex items-center justify-center relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            {fullscreenGallery.photos.map((ph, idx) => (
                                <img 
                                    key={idx} 
                                    src={ph} 
                                    className={`absolute max-w-full max-h-[85vh] object-contain transition-all duration-500 pointer-events-none rounded-xl ${idx === fullscreenGallery.index ? 'opacity-100 scale-100 z-10 shadow-2xl' : 'opacity-0 scale-95 z-0'}`} 
                                    alt={`zoom-${idx}`} 
                                />
                            ))}
                        </div>

                        {fullscreenGallery.photos.length > 1 && (
                            <div className="absolute bottom-12 flex gap-2 z-[1010] bg-[#1A1108]/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                                {fullscreenGallery.photos.map((_, idx) => (
                                    <div key={idx} className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === fullscreenGallery.index ? 'bg-[#D4AF37] w-4 shadow-[0_0_8px_#D4AF37]' : 'bg-white/30'}`} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // ==========================================
    // RENDER: SUCCESS / CONFIRM WIZARD
    // ==========================================
    if (showSuccess) {
        return (
            <div className="absolute inset-0 z-[110] bg-[#F5F1E9] flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
                <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-xl">
                    <span className="material-icons text-white text-5xl">check_circle</span>
                </div>
                <h2 className="text-3xl font-black text-[#1A1108] mb-2 uppercase">Anúncio Publicado!</h2>
                <button onClick={() => { setShowSuccess(false); handleCloseWizard(); }} className="w-full bg-[#D4AF37] text-white py-4 rounded-xl font-black mt-10">Voltar ao Mercado</button>
            </div>
        );
    }

    if (showConfirm) {
        return (
            <div className="absolute inset-0 z-[110] bg-[#1A1108] flex flex-col">
                <header className="px-6 pt-12 pb-6 flex items-center gap-4 bg-[#1A1108]/80 backdrop-blur-md border-b border-white/5">
                    <button onClick={() => setShowConfirm(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white active:scale-90 transition-transform">
                        <span className="material-icons">arrow_back</span>
                    </button>
                    <h1 className="text-sm font-black uppercase tracking-widest text-white italic">Revisar Anúncio</h1>
                </header>

                <div className="flex-1 overflow-y-auto">
                    {/* Photos Preview */}
                    <div className="w-full aspect-square bg-neutral-900 relative">
                        {adData.photos && adData.photos.length > 0 ? (
                            <div className="flex overflow-x-auto snap-x snap-mandatory h-full scrollbar-hide">
                                {adData.photos.map((photo, i) => (
                                    <div key={i} className="min-w-full h-full snap-start relative">
                                        <img src={photo} className="w-full h-full object-cover" alt={`Preview ${i}`} />
                                        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-white">
                                            {i + 1} / {adData.photos.length}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center opacity-20">
                                <span className="material-icons text-6xl mb-2">image</span>
                                <span className="text-xs font-black uppercase tracking-widest text-white">Sem Fotos</span>
                            </div>
                        )}
                    </div>

                    <div className="p-8 space-y-8 pb-24">
                        <div>
                            <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest block mb-1">Título do Anúncio</span>
                            <h3 className="text-2xl font-black text-white italic leading-tight">{adData.title}</h3>
                        </div>

                        <div className="flex items-end gap-3">
                            <div className="flex-1">
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Preço</span>
                                <p className="text-3xl font-black text-[#D4AF37] italic">
                                    {adData.priceType === 'negotiable' ? 'A COMBINAR' : `R$ ${adData.price}`}
                                </p>
                            </div>
                            <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-0.5">Condição</span>
                                <span className="text-xs font-black text-white uppercase">{adData.isNew ? 'Novo' : 'Usado'}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Localização</span>
                                <div className="flex items-center gap-2 text-white/90">
                                    <span className="material-icons text-sm text-[#D4AF37]">place</span>
                                    <span className="text-sm font-bold">{adData.city}, {adData.uf}</span>
                                </div>
                            </div>

                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Descrição</span>
                                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{adData.description}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-[#1A1108] border-t border-white/5 flex gap-4 safe-area-bottom">
                    <button 
                        onClick={() => setShowConfirm(false)} 
                        className="flex-1 bg-white/5 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs border border-white/10 active:scale-95 transition-transform"
                    >
                        Editar
                    </button>
                    <button 
                        onClick={publishAd} 
                        className="flex-[2] bg-[#D4AF37] text-[#1A1108] py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-[#D4AF37]/20 active:scale-95 transition-transform"
                    >
                        Publicar Agora
                    </button>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER: CREATE WIZARD (DYNAMIC FORM)
    // ==========================================
    if (showCreateWizard) {
        return (
            <div className="absolute inset-0 z-[60] bg-[#F5F1E9] flex flex-col">
                <header className="px-6 py-6 bg-white flex justify-between items-center shadow-sm relative">
                    <div className="flex items-center gap-4">
                        <button onClick={() => { if (step > 1) setStep(step - 1); else handleCloseWizard(); }} className="material-icons active:scale-90 transition-transform">arrow_back</button>
                        <h1 className="text-xl font-black uppercase">Criar Anúncio</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="font-black text-[#D4AF37]">Passo {step}/3</span>
                        <button onClick={handleCloseWizard} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 active:scale-90 transition-transform">
                            <span className="material-icons text-lg">close</span>
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-black uppercase text-[#1A1108]/50 block mb-2">Categoria Principal</label>
                                <select value={adData.category} onChange={e => setAdData({...adData, category: e.target.value, subcategory: ''})} className="w-full p-4 rounded-xl border border-[#1A1108]/10 font-bold outline-none text-[#1A1108] bg-white">
                                    <option value="">Selecione...</option>
                                    {Object.keys(CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                                {adData.category === 'OUTROS' && (
                                    <input placeholder="Digite a categoria" value={adData.customCategory} onChange={e => setAdData({...adData, customCategory: e.target.value})} className="w-full mt-2 p-4 rounded-xl border font-bold text-[#1A1108]" />
                                )}
                            </div>

                            {adData.category && adData.category !== 'OUTROS' && (
                                <div>
                                    <label className="text-xs font-black uppercase text-[#1A1108]/50 block mb-2">Subcategoria</label>
                                    <select value={adData.subcategory} onChange={e => setAdData({...adData, subcategory: e.target.value})} className="w-full p-4 rounded-xl border border-[#1A1108]/10 font-bold outline-none text-[#1A1108] bg-white">
                                        <option value="">Selecione...</option>
                                        {(CATEGORIES as any)[adData.category]?.map((sub: string) => <option key={sub} value={sub}>{sub}</option>)}
                                    </select>
                                    {adData.subcategory === 'Outro' && (
                                        <input placeholder="Especifique" value={adData.customSubcategory} onChange={e => setAdData({...adData, customSubcategory: e.target.value})} className="w-full mt-2 p-4 rounded-xl border font-bold text-[#1A1108]" />
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-black uppercase text-[#1A1108]/50 block mb-2">Título do Anúncio</label>
                                <input value={adData.title} onChange={e => setAdData({...adData, title: e.target.value})} maxLength={60} placeholder="EX: CAVALO QUARTO DE MILHA" className="w-full p-4 rounded-xl border border-[#1A1108]/10 font-bold uppercase outline-none text-[#1A1108]" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-black uppercase text-[#1A1108]/50 block mb-2">Estado</label>
                                    <select value={adData.uf} onChange={e => setAdData({...adData, uf: e.target.value})} className="w-full p-4 rounded-xl border font-bold text-[#1A1108] bg-white">
                                        <option value="">UF</option>
                                        {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-black uppercase text-[#1A1108]/50 block mb-2">Cidade</label>
                                    <select value={adData.city} onChange={e => setAdData({...adData, city: e.target.value})} disabled={loadingCities || !adData.uf} className="w-full p-4 rounded-xl border font-bold text-[#1A1108] bg-white disabled:text-[#1A1108]/40">
                                        <option value="">Cidade</option>
                                        {cities.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-white p-4 rounded-xl border">
                                <h4 className="font-black uppercase">Preço a combinar?</h4>
                                <input type="checkbox" checked={adData.priceType === 'negotiable'} onChange={e => setAdData({...adData, priceType: e.target.checked ? 'negotiable' : 'fixed'})} className="w-6 h-6" />
                            </div>

                            {adData.priceType === 'fixed' && (
                                <div>
                                    <label className="text-xs font-black uppercase text-[#1A1108]/50 block mb-2">Valor (R$)</label>
                                    <input type="number" value={adData.price} onChange={e => setAdData({...adData, price: e.target.value})} placeholder="0,00" className="w-full p-4 rounded-xl border font-black text-xl text-[#1A1108]" />
                                </div>
                            )}

                            {/* Dynamic Fields based on Category */}
                            {adData.category === 'ANIMAIS' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold text-[#1A1108]/60">Sexo</label><select onChange={e=>setAdData(p=>({...p, metadata: {...p.metadata, sexo: e.target.value}}))} className="w-full p-3 border rounded-lg text-[#1A1108] bg-white"><option value="">Selecione</option><option value="Macho">Macho</option><option value="Fêmea">Fêmea</option></select></div>
                                    <div><label className="text-xs font-bold text-[#1A1108]/60">Raça</label><input onChange={e=>setAdData(p=>({...p, metadata: {...p.metadata, raca: e.target.value}}))} className="w-full p-3 border rounded-lg text-[#1A1108]" placeholder="Ex: Quarto de Milha" /></div>
                                </div>
                            )}
                            {(adData.category === 'EQUIPAMENTOS' || adData.category === 'VEICULOS') && (
                                <div><label className="text-xs font-bold text-[#1A1108]/60">Condição</label><select onChange={e=>setAdData(p=>({...p, metadata: {...p.metadata, estado_uso: e.target.value}}))} className="w-full p-3 border rounded-lg text-[#1A1108] bg-white"><option value="">Selecione</option><option value="NOVO">NOVO</option><option value="SEMINOVO">SEMINOVO</option><option value="USADO">USADO</option></select></div>
                            )}
                            {adData.category === 'EVENTOS' && (
                                <div>
                                    <label className="text-xs font-bold">Tipo de Produto</label>
                                    <select value={adData.product_type} onChange={e=>setAdData(p=>({...p, product_type: e.target.value}))} className="w-full p-3 border rounded-lg text-[#1A1108] bg-white"><option value="ingresso">Ingresso</option><option value="senha">Senha de Vaquejada</option></select>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-black uppercase text-[#1A1108]/50 block mb-2">Descrição</label>
                                <textarea value={adData.description} onChange={e => setAdData({...adData, description: e.target.value})} rows={4} className="w-full p-4 rounded-xl border font-medium outline-none text-[#1A1108]" placeholder="Detalhes do produto..."></textarea>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <p className="font-black uppercase text-center">Fotos do Anúncio</p>
                            <div className="grid grid-cols-3 gap-2">
                                {adData.photos.map((p, i) => <img key={i} src={p} className="w-full aspect-square object-cover rounded-xl" alt="" />)}
                                {isUploading && <div className="w-full aspect-square rounded-xl bg-neutral-200 animate-pulse flex items-center justify-center"><span className="material-icons animate-spin text-neutral-400">sync</span></div>}
                                <label className="w-full aspect-square rounded-xl border-2 border-dashed border-[#D4AF37] flex items-center justify-center cursor-pointer">
                                    <span className="material-icons text-[#D4AF37]">add_a_photo</span>
                                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleRealPhotoUpload} />
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-white flex gap-3">
                    {step > 1 && (
                        <button onClick={() => setStep(step - 1)} className="flex-shrink-0 bg-white border-2 border-[#1A1108]/10 text-[#1A1108] px-5 py-4 rounded-xl font-black uppercase flex items-center gap-1">
                            <span className="material-icons text-lg">arrow_back</span>
                            Voltar
                        </button>
                    )}
                    <button onClick={() => { if(step < 3) setStep(step + 1); else setShowConfirm(true); }} className="flex-1 bg-[#D4AF37] text-white py-4 rounded-xl font-black uppercase shadow-lg disabled:opacity-50">
                        {step === 3 ? 'Finalizar e Revisar' : 'Próximo Passo'}
                    </button>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER: MAIN FEED
    // ==========================================
    // ==========================================
    // RENDER: MAIN FEED
    // ==========================================
    
    const VISUAL_CATEGORIES = [
        { id: 'all', label: 'Todos', icon: 'apps' },
        { id: 'CAVALOS', label: 'Cavalos', icon: 'pets' },
        { id: 'CAMINHÕES', label: 'Caminhões', icon: 'local_shipping' },
        { id: 'ARREIOS', label: 'Arreios', icon: 'shopping_bag' },
        { id: 'ACESSÓRIOS', label: 'Acessórios', icon: 'category' },
        { id: 'ANIMAIS', label: 'Animais', icon: 'cruelty_free' },
        { id: 'OUTROS', label: 'Outros', icon: 'more_horiz' }
    ];

    const highlights = publishedAds.length > 0 ? [...publishedAds].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4) : [];

    return (
        <PullToRefresh onRefresh={handleRefresh} className="bg-[#0F0A05]">
            <div className="min-h-full pb-24 relative bg-[#0F0A05]">
            {/* Header Sticky Premium */}
            <div className="sticky top-0 z-40 bg-[#0F0A05]/90 backdrop-blur-xl border-b border-white/5 pt-12 pb-4 shadow-2xl">
                <div className="px-6 flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-black/40 border border-[#D4AF37]/30 flex items-center justify-center shadow-lg">
                            <span className="material-icons text-[#D4AF37] text-xl drop-shadow-md">storefront</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none">MERCADO</h1>
                            <p className="text-[9px] font-black uppercase text-[#D4AF37] tracking-[0.3em] mt-0.5">+VAQUEJADA PREMIUM</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            if (!user) window.dispatchEvent(new CustomEvent('arena_show_login'));
                            else setShowCreateWizard(true);
                        }} 
                        className="bg-gradient-to-r from-[#D4AF37] to-[#AA8A2E] px-4 h-10 rounded-xl flex items-center gap-2 shadow-lg shadow-[#D4AF37]/20 active:scale-95 transition-transform border border-white/20"
                    >
                        <span className="material-icons text-[#0F0A05] text-sm">add_circle</span>
                        <span className="text-[#0F0A05] font-black uppercase tracking-widest text-[10px]">Anunciar</span>
                    </button>
                </div>
                {/* Search Premium */}
                <div className="px-6 relative group">
                    <span className="material-icons absolute left-10 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#D4AF37] transition-colors">search</span>
                    <input 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        type="text" 
                        placeholder="Buscar cavalos, caminhões, arreios..." 
                        className="w-full bg-[#1A1108] border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/50 focus:bg-[#1A1108]/80 shadow-inner transition-all" 
                    />
                </div>
            </div>

            {/* Top Banners */}
            <div className="pt-4">
                <AdsCarousel targetPosition="market_top_carousel" />
            </div>

            <GuestCTA />

            {/* Categorias Circulares Premium */}
            <div className="py-6">
                <div className="px-6 flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Explorar por Categoria</h3>
                </div>
                <div className="flex gap-4 overflow-x-auto hide-scrollbar px-6 pb-2">
                    {VISUAL_CATEGORIES.map(cat => (
                        <button 
                            key={cat.id} 
                            onClick={() => setActiveFilterCat(cat.id)} 
                            className="flex flex-col items-center gap-2 group outline-none"
                        >
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${activeFilterCat === cat.id ? 'bg-[#D4AF37]/10 border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]' : 'bg-[#1A1108] border-white/5 group-hover:border-[#D4AF37]/40 group-active:scale-95'}`}>
                                <span className={`material-icons text-2xl transition-colors ${activeFilterCat === cat.id ? 'text-[#D4AF37]' : 'text-white/40 group-hover:text-[#D4AF37]/80'}`}>
                                    {cat.icon}
                                </span>
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${activeFilterCat === cat.id ? 'text-[#D4AF37]' : 'text-white/40 group-hover:text-white/80'}`}>
                                {cat.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Destaques (Highlights) */}
            {highlights.length > 0 && activeFilterCat === 'all' && !searchTerm && (
                <div className="py-4 mb-2">
                    <div className="px-6 flex items-center gap-2 mb-4">
                        <span className="material-icons text-[#D4AF37] text-sm animate-pulse">local_fire_department</span>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">Destaques do Mercado</h3>
                    </div>
                    <div className="flex gap-4 overflow-x-auto hide-scrollbar px-6 pb-4">
                        {highlights.map(ad => (
                            <div 
                                key={`highlight-${ad.id}`} 
                                onClick={() => setViewingAd(ad)} 
                                className="w-72 shrink-0 bg-[#1A1108] rounded-3xl overflow-hidden border border-white/10 shadow-xl relative group active:scale-[0.98] transition-all"
                            >
                                <div className="h-40 w-full relative">
                                    <img src={ad.img || ad.photos?.[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={ad.title} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#1A1108] via-transparent to-black/30"></div>
                                    <div className="absolute top-3 left-3 bg-[#D4AF37] text-[#0F0A05] text-[8px] font-black px-2 py-1 rounded shadow-lg uppercase tracking-widest">
                                        EM ALTA
                                    </div>
                                    <div className="absolute bottom-3 left-4 right-4">
                                        <h4 className="text-white font-black text-sm uppercase truncate drop-shadow-md">{ad.title}</h4>
                                        <p className="text-[#D4AF37] font-black text-sm drop-shadow-md">{ad.price}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Lojas Parceiras Premium */}
            {stores.length > 0 && activeFilterCat === 'all' && !searchTerm && (
                <div className="py-6 bg-gradient-to-b from-[#1A1108]/50 to-transparent border-t border-b border-white/5 mb-6">
                    <div className="px-6 flex justify-between items-center mb-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Lojas Parceiras Oficiais</h3>
                        <span className="text-[8px] text-[#D4AF37] border border-[#D4AF37]/30 px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">Verificadas</span>
                    </div>
                    <div className="flex overflow-x-auto px-6 gap-5 hide-scrollbar pb-2">
                        {stores.map((store) => (
                            <div 
                                key={store.id} 
                                onClick={() => {
                                    window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view: 'STORE_DETAILS', store: store } }));
                                }}
                                className="flex flex-col items-center shrink-0 cursor-pointer group w-20"
                            >
                                <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-[#D4AF37]/20 via-white/5 to-[#D4AF37]/40 group-hover:from-[#D4AF37] group-hover:to-[#AA8A2E] transition-all mb-3 shadow-lg relative active:scale-95">
                                    <div className="w-full h-full rounded-full bg-[#1A1108] overflow-hidden flex items-center justify-center border-2 border-[#0F0A05]">
                                        {store.logo_url ? (
                                            <img src={store.logo_url} className="w-full h-full object-cover" alt={store.nome} />
                                        ) : (
                                            <span className="material-icons text-white/20 text-2xl">store</span>
                                        )}
                                    </div>
                                    {store.verificado && (
                                        <div className="absolute -bottom-1 -right-1 bg-[#0F0A05] rounded-full p-0.5">
                                            <span className="material-icons text-[#D4AF37] text-sm">verified</span>
                                        </div>
                                    )}
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest text-center w-full truncate transition-colors ${selectedStore?.id === store.id ? 'text-[#D4AF37]' : 'text-white/60 group-hover:text-white'}`}>
                                    {store.nome}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Listagem Principal e Ordenação */}
            <div className="px-6 mb-4 flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Catálogo</h3>
                
                {/* Modern Sort Filters */}
                <div className="flex gap-2 bg-[#1A1108] p-1 rounded-xl border border-white/5">
                    <button 
                        onClick={() => setSortOrder('recent')}
                        className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${sortOrder === 'recent' ? 'bg-[#D4AF37] text-[#0F0A05]' : 'text-white/40 hover:text-white'}`}
                    >Recentes</button>
                    <button 
                        onClick={() => setSortOrder('lowest')}
                        className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${sortOrder === 'lowest' ? 'bg-[#D4AF37] text-[#0F0A05]' : 'text-white/40 hover:text-white'}`}
                    >Menor R$</button>
                    <button 
                        onClick={() => setSortOrder('highest')}
                        className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${sortOrder === 'highest' ? 'bg-[#D4AF37] text-[#0F0A05]' : 'text-white/40 hover:text-white'}`}
                    >Maior R$</button>
                </div>
            </div>

            {/* Grid */}
            <div className="px-6">
                {loadingAds ? (
                    <div className="grid grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="aspect-[3/4] bg-[#1A1108] rounded-3xl animate-pulse border border-white/5"></div>
                        ))}
                    </div>
                ) : filteredAds.length === 0 ? (
                    <div className="text-center py-20 bg-[#1A1108] rounded-3xl border border-white/5 mt-4">
                        <span className="material-icons text-6xl text-white/10 mb-4">search_off</span>
                        <h3 className="text-white/40 font-black uppercase tracking-widest text-xs">Nenhum anúncio encontrado</h3>
                        <p className="text-white/20 text-[10px] mt-2 px-8 uppercase">Tente buscar por outros termos ou categorias.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {filteredAds.map((ad, i) => (
                            <React.Fragment key={i}>
                                <div onClick={() => setViewingAd(ad)} className="bg-[#1A1108] rounded-[24px] overflow-hidden shadow-lg border border-white/5 active:scale-[0.98] transition-transform group">
                                    <div className="aspect-[4/5] relative bg-[#0F0A05] overflow-hidden">
                                        <img src={ad.img || ad.photos?.[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={ad.title} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#1A1108] via-transparent to-black/20"></div>
                                        
                                        {/* Badges Overlay */}
                                        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                                            {ad.product_type === 'ingresso' && <div className="bg-blue-600/90 text-white text-[7px] font-black px-2 py-1 rounded shadow-lg uppercase tracking-widest backdrop-blur-md">INGRESSO</div>}
                                            {ad.stores?.is_official && <div className="bg-gradient-to-r from-[#D4AF37] to-[#AA8A2E] text-[#0F0A05] text-[7px] font-black px-2 py-1 rounded shadow-lg uppercase tracking-widest flex items-center gap-1 backdrop-blur-md">
                                                <span className="material-icons text-[8px]">verified</span> OFICIAL
                                            </div>}
                                        </div>

                                        {/* Heart Overlay */}
                                        <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center">
                                            <span className="material-icons text-white/60 text-sm">favorite_border</span>
                                        </button>

                                        {/* Content Overlay */}
                                        <div className="absolute bottom-0 left-0 right-0 p-4">
                                            <h3 className="text-xs font-black uppercase text-white leading-tight truncate drop-shadow-md">{ad.title}</h3>
                                            <p className="text-sm font-black text-[#D4AF37] my-1 truncate drop-shadow-md">{ad.price}</p>
                                        </div>
                                    </div>
                                    <div className="px-4 py-3 bg-[#1A1108] flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-white/40">
                                            <span className="material-icons text-[10px] text-[#D4AF37]">place</span>
                                            <span className="text-[8px] font-bold uppercase truncate max-w-[90px]">{ad.loc}</span>
                                        </div>
                                        <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">{ad.category}</span>
                                    </div>
                                </div>
                                
                                {/* A cada 12 anúncios, injeta um banner */}
                                {(i + 1) % 12 === 0 && (
                                    <div className="col-span-2 my-2">
                                        <AdsCarousel targetPosition="market_inline_banner" />
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </PullToRefresh>
    );
};

export default MarketView;
