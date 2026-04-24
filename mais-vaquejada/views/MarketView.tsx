import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View } from '../types';
import { supabase } from '../lib/supabase';
import AdsCarousel from '../components/AdsCarousel';
import { compressImage } from '../lib/imageUtils';

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
    'EVENTOS': ['Ingressos', 'Senhas', 'Camarotes'],
    'OUTROS': ['Outro']
};

interface MarketViewProps {
    user: any;
    forceShowWizard?: boolean;
    onWizardClose?: () => void;
    onViewChange?: (view: View) => void;
}

const MarketView: React.FC<MarketViewProps> = ({ user, forceShowWizard = false, onWizardClose, onViewChange }) => {
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
    const [selectedStore, setSelectedStore] = useState<any>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilterCat, setActiveFilterCat] = useState('all');
    
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
                .select('*, profiles:user_id(name, avatar_url, username), stores:store_id(name, is_official, logo_url)')
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
                .from('stores')
                .select('*')
                .eq('active', true)
                .order('is_official', { ascending: false });
            if (error) throw error;
            setStores(data || []);
        } catch (err) {
            console.error('Error fetching stores:', err);
        } finally {
            setLoadingStores(false);
        }
    };

    useEffect(() => {
        fetchAds();
        fetchStores();
        const channel = supabase.channel('market_items_rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'market_items' }, fetchAds)
            .subscribe();
        
        const storeChannel = supabase.channel('stores_rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stores' }, fetchStores)
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
                
                const { error: uploadError } = await supabase.storage.from('vaquejadas').upload(fileName, fileToUpload);
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
        return publishedAds.filter(ad => {
            if (activeFilterCat !== 'all') {
                const cat = (ad.category || '').toUpperCase();
                let matchCat = cat;
                if (cat === 'CAVALOS') matchCat = 'ANIMAIS';
                else if (cat === 'TRANSPORTE') matchCat = 'VEICULOS';
                else if (cat === 'ALIMENTACAO') matchCat = 'ALIMENTACAO';
                else if (cat === 'SERVIÇOS') matchCat = 'SERVICOS';
                else if (cat === 'EQUIPAMENTOS') matchCat = 'EQUIPAMENTOS';

                if (matchCat !== activeFilterCat) return false;
            }
            if (selectedStore) {
                // Filter by store_id or by owner's user_id to catch all items
                const isFromStore = ad.store_id === selectedStore.id;
                const isFromOwner = ad.user_id === selectedStore.user_id;
                if (!isFromStore && !isFromOwner) return false;
            }
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                return ad.title?.toLowerCase().includes(term) || ad.description?.toLowerCase().includes(term) || ad.category?.toLowerCase().includes(term) || ad.subcategory?.toLowerCase().includes(term);
            }
            return true;
        });
    }, [publishedAds, activeFilterCat, searchTerm, selectedStore]);


    // ==========================================
    // RENDER: VIEW AD
    // ==========================================
    if (viewingAd) {
        const seller = viewingAd.profiles || { name: 'Vendedor', username: 'vendedor', avatar_url: '' };
        const store = viewingAd.stores; // Base para Módulo 2
        const isOwnerOrAdmin = user?.id === viewingAd.user_id || user?.role === 'ADMIN' || user?.role === 'ADMIN_MASTER' || user?.isMaster;

        return (
            <div className="absolute inset-0 z-[100] bg-[#F5F1E9] flex flex-col animate-in slide-in-from-right duration-300">
                <div className="flex-1 overflow-y-auto pb-32">
                    <div className="relative">
                        <div className="absolute top-6 left-6 z-20">
                            <button onClick={() => setViewingAd(null)} className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg">
                                <span className="material-icons">arrow_back</span>
                            </button>
                        </div>
                        {isOwnerOrAdmin && (
                            <div className="absolute top-6 right-6 z-20">
                                <button onClick={async () => { await deleteAdDirectly(viewingAd); setViewingAd(null); }} className="w-10 h-10 rounded-full bg-red-500/80 backdrop-blur-md flex items-center justify-center text-white shadow-lg active:scale-90">
                                    <span className="material-icons text-xl">delete</span>
                                </button>
                            </div>
                        )}

                        <div className="h-[380px] relative bg-neutral-900 group">
                            {Array.isArray(viewingAd.photos) && viewingAd.photos.length > 1 ? (
                                <div className="flex w-full h-full overflow-x-auto snap-x snap-mandatory hide-scrollbar" onScroll={(e: any) => setCurrentPhotoIdx(Math.round(e.target.scrollLeft / e.target.offsetWidth))}>
                                    {viewingAd.photos.map((ph: string, idx: number) => (
                                        <div key={idx} className="w-full h-full shrink-0 snap-center" onClick={() => setFullscreenGallery({ photos: viewingAd.photos, index: idx })}>
                                            <img src={ph} className="w-full h-full object-cover" alt="Preview" />
                                        </div>
                                    ))}
                                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2 z-10 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md">
                                        {viewingAd.photos.map((_: any, idx: number) => (
                                            <div key={idx} className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentPhotoIdx ? 'bg-[#D4AF37] w-4' : 'bg-white/40'}`} />
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <img src={viewingAd.img || viewingAd.photos?.[0]} className="w-full h-full object-cover" onClick={() => setFullscreenGallery({ photos: viewingAd.photos?.length ? viewingAd.photos : [viewingAd.img || ''], index: 0 })} alt="Preview" />
                            )}
                            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#F5F1E9] to-transparent"></div>
                            <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                                <div>
                                    {viewingAd.product_type === 'ingresso' && <span className="bg-blue-500 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest mb-2 inline-block shadow-lg mr-2">INGRESSO</span>}
                                    {store?.is_official && <span className="bg-green-500 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest mb-2 inline-block shadow-lg">LOJA OFICIAL</span>}
                                    <h2 className="text-[#1A1108] text-2xl font-black uppercase leading-tight">{viewingAd.title}</h2>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 pt-2">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-[10px] font-black text-[#1A1108]/40 uppercase tracking-widest mb-1">VALOR</p>
                                <p className="text-3xl font-black text-[#D4AF37]">{viewingAd.price}</p>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1 text-[#1A1108]/60 mb-1">
                                    <span className="material-icons text-sm">place</span>
                                    <span className="text-xs font-bold uppercase">{viewingAd.loc}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Loja / Seller Info */}
                            {store ? (
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#D4AF37]/20 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full overflow-hidden border border-[#D4AF37]">
                                            <img src={store.logo_url || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black uppercase text-[#1A1108] tracking-wide">{store.name}</p>
                                            <div className="flex items-center gap-1">
                                                <span className="material-icons text-[10px] text-green-500">store</span>
                                                <p className="text-[9px] font-bold text-[#1A1108]/60">Loja Parceira</p>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => {
                                        setSelectedStore(store);
                                        setViewingAd(null);
                                        setActiveFilterCat('all');
                                    }} className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest border border-[#D4AF37]/30 px-3 py-1.5 rounded-lg">Visitar Loja</button>
                                </div>
                            ) : (
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#1A1108]/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div onClick={() => navigateToProfile(seller.username)} className="w-12 h-12 rounded-full bg-neutral-200 overflow-hidden border border-[#D4AF37]/30 cursor-pointer">
                                            <img src={seller.avatar_url || `https://ui-avatars.com/api/?name=${seller.name}&background=random`} className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <p onClick={() => navigateToProfile(seller.username)} className="text-sm font-black uppercase text-[#1A1108] cursor-pointer hover:underline">{seller.name || 'Anunciante'}</p>
                                            <p className="text-[9px] font-bold text-[#1A1108]/40">Vendedor</p>
                                        </div>
                                    </div>
                                    <button onClick={() => navigateToProfile(seller.username)} className="text-[10px] font-black text-[#1A1108]/40 uppercase border border-[#1A1108]/10 px-3 py-1.5 rounded-lg">Ver Perfil</button>
                                </div>
                            )}

                            {/* Details Grid */}
                            <div>
                                <h3 className="text-sm font-black text-[#1A1108] uppercase tracking-wide mb-3 border-l-4 border-[#D4AF37] pl-3">Detalhes</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white p-3 rounded-xl border border-[#1A1108]/5">
                                        <p className="text-[9px] font-black text-[#1A1108]/30 uppercase tracking-widest mb-1">CATEGORIA</p>
                                        <p className="text-xs font-bold text-[#1A1108]">{viewingAd.category}</p>
                                    </div>
                                    {viewingAd.subcategory && (
                                        <div className="bg-white p-3 rounded-xl border border-[#1A1108]/5">
                                            <p className="text-[9px] font-black text-[#1A1108]/30 uppercase tracking-widest mb-1">TIPO</p>
                                            <p className="text-xs font-bold text-[#1A1108]">{viewingAd.subcategory}</p>
                                        </div>
                                    )}
                                    {/* Render Metadata Dynamic Fields */}
                                    {viewingAd.metadata && Object.entries(viewingAd.metadata).map(([key, val]: any) => {
                                        if (!val) return null;
                                        // Translate keys
                                        const labels: any = { estado_uso: 'CONDIÇÃO', sexo: 'SEXO', raca: 'RAÇA', ano: 'ANO', marca: 'MARCA' };
                                        const label = labels[key] || key.toUpperCase();
                                        return (
                                            <div key={key} className="bg-white p-3 rounded-xl border border-[#1A1108]/5">
                                                <p className="text-[9px] font-black text-[#1A1108]/30 uppercase tracking-widest mb-1">{label}</p>
                                                <p className="text-xs font-bold text-[#1A1108]">{String(val).toUpperCase()}</p>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="pb-10">
                                <h3 className="text-sm font-black text-[#1A1108] uppercase tracking-wide mb-3 border-l-4 border-[#D4AF37] pl-3">Descrição</h3>
                                <p className="text-sm text-[#1A1108]/70 leading-relaxed font-medium whitespace-pre-wrap">
                                    {viewingAd.description || 'Sem descrição.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 pb-8 bg-white border-t border-[#1A1108]/5 flex gap-3 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                    <button onClick={() => toggleFavorite(viewingAd.title)} className={`w-14 h-14 rounded-xl bg-[#1A1108]/5 flex items-center justify-center ${favorites.includes(viewingAd.title) ? 'text-red-500' : 'text-[#1A1108]/40'}`}>
                        <span className="material-icons">{favorites.includes(viewingAd.title) ? 'favorite' : 'favorite_border'}</span>
                    </button>
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view: 'SOCIAL', openDM: seller.username } }))}
                        className="flex-1 bg-[#D4AF37] text-white rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-widest shadow-lg shadow-[#D4AF37]/20"
                    >
                        <span className="material-icons text-lg">chat_bubble</span>
                        <span className="text-xs">Negociar no Chat</span>
                    </button>
                </div>

                {fullscreenGallery && (
                    <div 
                        className="fixed inset-0 z-[1000] bg-black/95 flex flex-col items-center justify-center" 
                        onClick={() => setFullscreenGallery(null)}
                        onTouchStart={(e) => setTouchStart(e.targetTouches[0].clientX)}
                        onTouchEnd={(e) => {
                            if (touchStart === null) return;
                            const distance = touchStart - e.changedTouches[0].clientX;
                            const isLeftSwipe = distance > 50;
                            const isRightSwipe = distance < -50;
                            if (isLeftSwipe) {
                                e.stopPropagation();
                                setFullscreenGallery(prev => prev ? {...prev, index: (prev.index + 1) % prev.photos.length} : null);
                            } else if (isRightSwipe) {
                                e.stopPropagation();
                                setFullscreenGallery(prev => prev ? {...prev, index: (prev.index - 1 + prev.photos.length) % prev.photos.length} : null);
                            }
                            setTouchStart(null);
                        }}
                    >
                        <button onClick={() => setFullscreenGallery(null)} className="absolute top-10 right-10 text-white p-2 z-[1010]"><span className="material-icons text-3xl">close</span></button>
                        
                        {fullscreenGallery.photos.length > 1 && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); setFullscreenGallery(prev => prev ? {...prev, index: (prev.index - 1 + prev.photos.length) % prev.photos.length} : null) }} className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-3 bg-black/50 rounded-full z-[1010]"><span className="material-icons">chevron_left</span></button>
                                <button onClick={(e) => { e.stopPropagation(); setFullscreenGallery(prev => prev ? {...prev, index: (prev.index + 1) % prev.photos.length} : null) }} className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-3 bg-black/50 rounded-full z-[1010]"><span className="material-icons">chevron_right</span></button>
                            </>
                        )}
                        
                        <div className="w-full h-full flex items-center justify-center relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            {fullscreenGallery.photos.map((ph, idx) => (
                                <img 
                                    key={idx} 
                                    src={ph} 
                                    className={`absolute max-w-full max-h-[85vh] object-contain transition-opacity duration-300 pointer-events-none ${idx === fullscreenGallery.index ? 'opacity-100 z-10' : 'opacity-0 z-0'}`} 
                                    alt={`zoom-${idx}`} 
                                />
                            ))}
                        </div>

                        {fullscreenGallery.photos.length > 1 && (
                            <div className="absolute bottom-10 flex gap-2 z-[1010]">
                                {fullscreenGallery.photos.map((_, idx) => (
                                    <div key={idx} className={`w-2 h-2 rounded-full transition-all ${idx === fullscreenGallery.index ? 'bg-white scale-125' : 'bg-white/30'}`} />
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
                <header className="px-6 py-6 bg-white flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => { if (step > 1) setStep(step - 1); else handleCloseWizard(); }} className="material-icons">arrow_back</button>
                        <h1 className="text-xl font-black uppercase">Criar Anúncio</h1>
                    </div>
                    <span className="font-black text-[#D4AF37]">Passo {step}/3</span>
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
    return (
        <div className="min-h-full pb-24 relative bg-[#F5F1E9]">
            {/* Header Sticky */}
            <div className="sticky top-0 z-40 bg-[#1A1108] text-white px-6 pt-12 pb-4 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <span className="material-icons text-[#D4AF37] text-3xl">storefront</span>
                        <div>
                            <h1 className="text-3xl font-black italic uppercase tracking-tight leading-none">MERCADO</h1>
                            <p className="text-[10px] font-black uppercase text-[#D4AF37] tracking-[0.3em] mt-1">+VAQUEJADA</p>
                        </div>
                    </div>
                    <button onClick={() => setShowCreateWizard(true)} className="bg-[#D4AF37] w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"><span className="material-icons text-white">add</span></button>
                </div>
                {/* Search */}
                <div className="relative">
                    <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-white/40">search</span>
                    <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} type="text" placeholder="Buscar cavalos, caminhões, arreios..." className="w-full bg-white/10 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm font-bold text-white placeholder:text-white/40 outline-none focus:border-[#D4AF37] transition-all" />
                </div>
            </div>

            {/* Ads Carousel (Optional Banner) */}
            <AdsCarousel targetPosition="market_top_carousel" />

            {/* Categories Filter */}
            <div className="px-6 py-4 overflow-x-auto hide-scrollbar flex gap-2">
                <button onClick={() => setActiveFilterCat('all')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all ${activeFilterCat === 'all' ? 'bg-[#D4AF37] text-white' : 'bg-white border border-[#1A1108]/10 text-[#1A1108]/60'}`}>TODOS</button>
                {Object.keys(CATEGORIES).map(cat => (
                    <button key={cat} onClick={() => setActiveFilterCat(cat)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all ${activeFilterCat === cat ? 'bg-[#D4AF37] text-white' : 'bg-white border border-[#1A1108]/10 text-[#1A1108]/60'}`}>{cat}</button>
                ))}
            </div>

            {/* Partner Stores Section */}
            {stores.length > 0 && (
                <div className="py-6 border-b border-[#1A1108]/5">
                    <div className="px-6 flex justify-between items-center mb-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1108]/60">Lojas Parceiras</h3>
                        {selectedStore && (
                            <button onClick={() => setSelectedStore(null)} className="text-[9px] font-black uppercase text-[#D4AF37] tracking-widest bg-[#D4AF37]/10 px-3 py-1 rounded-full">Ver Todos</button>
                        )}
                    </div>
                    <div className="flex overflow-x-auto px-6 gap-6 scrollbar-hide pb-2">
                        {stores.map((store) => (
                            <div 
                                key={store.id} 
                                onClick={() => {
                                    setSelectedStore(store);
                                    setActiveFilterCat('all');
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="flex flex-col items-center shrink-0 cursor-pointer active:scale-95 transition-all group"
                            >
                                <div className={`w-16 h-16 rounded-full border-2 p-0.5 transition-all mb-2 ${selectedStore?.id === store.id ? 'border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20' : 'border-[#1A1108]/5 group-hover:border-[#1A1108]/20'}`}>
                                    <div className="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center border border-white/50">
                                        {store.logo_url ? (
                                            <img src={store.logo_url} className="w-full h-full object-cover" alt={store.name} />
                                        ) : (
                                            <span className="material-icons text-[#1A1108]/20 text-3xl">store</span>
                                        )}
                                    </div>
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-tight text-center max-w-[80px] truncate ${selectedStore?.id === store.id ? 'text-[#D4AF37]' : 'text-[#1A1108]/60'}`}>
                                    {store.name}
                                    {store.is_official && <span className="material-icons text-[10px] ml-0.5 align-middle text-[#D4AF37]">verified</span>}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}


            {/* Grid */}
            <div className="px-6">
                {loadingAds ? (
                    <div className="grid grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map(i => <div key={i} className="aspect-[3/4] bg-white rounded-2xl animate-pulse"></div>)}
                    </div>
                ) : filteredAds.length === 0 ? (
                    <div className="text-center py-20">
                        <span className="material-icons text-6xl text-[#1A1108]/10 mb-4">search_off</span>
                        <h3 className="text-[#1A1108]/40 font-black uppercase">Nenhum anúncio encontrado</h3>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {filteredAds.map((ad, i) => (
                            <React.Fragment key={i}>
                                <div onClick={() => setViewingAd(ad)} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#1A1108]/5 active:scale-[0.98] transition-transform">
                                    <div className="aspect-square relative bg-neutral-200">
                                        <img src={ad.img || ad.photos?.[0]} className="w-full h-full object-cover" alt={ad.title} />
                                        {ad.product_type === 'ingresso' && <div className="absolute top-2 left-2 bg-blue-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">INGRESSO</div>}
                                        {ad.stores?.is_official && <div className="absolute top-2 right-2 bg-green-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1"><span className="material-icons text-[10px]">verified</span> OFICIAL</div>}
                                    </div>
                                    <div className="p-3">
                                        <h3 className="text-xs font-black uppercase text-[#1A1108] leading-tight truncate">{ad.title}</h3>
                                        <p className="text-sm font-black text-[#D4AF37] my-1 truncate">{ad.price}</p>
                                        <div className="flex items-center gap-1 text-[#1A1108]/40">
                                            <span className="material-icons text-[10px]">place</span>
                                            <span className="text-[8px] font-bold uppercase truncate">{ad.loc}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* A cada 20 anúncios, injeta um banner */}
                                {(i + 1) % 20 === 0 && (
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
    );
};

export default MarketView;
