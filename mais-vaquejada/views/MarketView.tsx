
import React, { useState, useRef, useEffect } from 'react';
import { View } from '../types';

const STATES = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const MOCK_ADVERTISERS = [
    { id: '1', name: 'Haras PFF', img: 'https://picsum.photos/seed/haras1/800/200' },
    { id: '2', name: 'Integral Mix', img: 'https://picsum.photos/seed/haras2/800/200' },
    { id: '3', name: 'Organnact', img: 'https://picsum.photos/seed/haras3/800/200' },
    { id: '4', name: 'Vaquejada do Sertão', img: 'https://picsum.photos/seed/haras4/800/200' },
];

interface MarketViewProps {
    forceShowWizard?: boolean;
    onWizardClose?: () => void;
    onViewChange?: (view: View) => void;
}

const MarketView: React.FC<MarketViewProps> = ({ forceShowWizard = false, onWizardClose, onViewChange }) => {
    const [showCreateWizard, setShowCreateWizard] = useState(forceShowWizard);

    // Sync local wizard state with prop (for global navigation)
    useEffect(() => {
        setShowCreateWizard(forceShowWizard);
    }, [forceShowWizard]);

    const [step, setStep] = useState(1);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [viewingAd, setViewingAd] = useState<any>(null);
    const [favorites, setFavorites] = useState<string[]>(() => {
        const saved = localStorage.getItem('arena_market_favorites');
        return saved ? JSON.parse(saved) : [];
    });
    const [adIndex, setAdIndex] = useState(0);
    const [publishedAds, setPublishedAds] = useState<any[]>([]);
    const [activeCategoryId, setActiveCategoryId] = useState('all');

    const FILTER_TAGS = [
        { label: 'TUDO', id: 'all' },
        { label: 'CAVALOS', id: 'horse' },
        { label: 'MAQUINAS', id: 'truck' },
        { label: 'EQUIPAMENTOS', id: 'equip' },
        { label: 'ACESSÓRIOS', id: 'access' }
    ];

    const MOCK_MARKET_ITEMS = [
        { title: 'SELA PROFISSIONAL LUXO', price: 'R$ 1.500', loc: 'CG, PB', img: 'https://picsum.photos/seed/sela/400', isNew: true, category: 'access' },
        { title: 'CAMINHÃO REBOQUE 2024', price: 'R$ 85.000', loc: 'JP, PB', img: 'https://picsum.photos/seed/truck/400', isNew: true, category: 'truck' },
        { title: 'CAVALO QUARTO DE MILHA', price: 'A COMBINAR', loc: 'CE, PE', img: 'https://picsum.photos/seed/horse/400', isNew: false, category: 'horse' },
        { title: 'BOTAS DE COURO LEGÍTIMO', price: 'R$ 350', loc: 'CG, PB', img: 'https://picsum.photos/seed/boots/400', isNew: false, category: 'access' },
        { title: 'VAN DE TRANSPORTE', price: 'R$ 120.000', loc: 'SP, SP', img: 'https://picsum.photos/seed/van/400', isNew: true, category: 'truck' },
        { title: 'POTRO QM 2 ANOS', price: 'A COMBINAR', loc: 'BA, MG', img: 'https://picsum.photos/seed/colt/400', isNew: true, category: 'horse' },
    ];

    useEffect(() => {
        localStorage.setItem('arena_market_favorites', JSON.stringify(favorites));
    }, [favorites]);

    useEffect(() => {
        const timer = setInterval(() => {
            setAdIndex(prev => (prev + 1) % MOCK_ADVERTISERS.length);
        }, 4000);
        return () => clearInterval(timer);
    }, []);

    const toggleFavorite = (title: string) => {
        setFavorites(prev =>
            prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
        );
    };

    const navigateToProfile = (username: string) => {
        window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view: 'PROFILE', username } }));
    };

    // Form State
    const [adData, setAdData] = useState({
        category: '',
        title: '',
        uf: '',
        city: '',
        priceType: 'fixed' as 'fixed' | 'negotiable',
        price: '',
        condition: '',
        description: '',
        // Category specific
        horseBreed: '',
        horseAge: '',
        horseSex: '',
        horseTraining: '',
        horseDocs: '',
        vehicleYear: '',
        vehicleKM: '',
        vehicleType: '',
        vehicleDocs: '',
        itemBrand: '',
        itemSize: '',
        itemNF: '',
        // Step 3
        photos: [] as string[],
        contactName: user?.name || 'Vendedor',
        showPhone: false,
        contactPref: 'chat'
    });

    const [cities, setCities] = useState<any[]>([]);
    const [loadingCities, setLoadingCities] = useState(false);

    useEffect(() => {
        if (adData.uf) {
            setLoadingCities(true);
            fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${adData.uf}/municipios?orderBy=nome`)
                .then(res => res.json())
                .then(data => {
                    setCities(data);
                    setLoadingCities(false);
                })
                .catch(err => {
                    console.error('Error fetching cities:', err);
                    setLoadingCities(false);
                });
        } else {
            setCities([]);
            setAdData(prev => ({ ...prev, city: '' }));
        }
    }, [adData.uf]);

    const categories = [
        { id: 'horse', label: 'Cavalo', icon: 'pets' },
        { id: 'truck', label: 'Caminhão/Carro', icon: 'local_shipping' },
        { id: 'equip', label: 'Equipamentos', icon: 'handyman' },
        { id: 'access', label: 'Acessórios', icon: 'checkroom' },
        { id: 'service', label: 'Serviços', icon: 'support_agent' },
        { id: 'other', label: 'Outros', icon: 'grid_view' },
    ];

    const handlePhotoUpload = () => {
        const dummyPhoto = `https://picsum.photos/seed/${Math.random()}/600`;
        setAdData({ ...adData, photos: [...adData.photos, dummyPhoto] });
    };

    const publishAd = () => {
        const newAd = {
            title: adData.title || 'Anúncio Sem Título',
            price: adData.priceType === 'negotiable' ? 'A COMBINAR' : `R$ ${adData.price}`,
            loc: `${adData.city || 'Cidade'}, ${adData.uf || 'UF'}`,
            img: adData.photos[0] || 'https://picsum.photos/seed/novo_anuncio/400',
            isNew: adData.condition === 'NOVO',
            description: adData.description,
            category: adData.category
        };
        setPublishedAds(prev => [newAd, ...prev]);
        setShowConfirm(false);
        setShowSuccess(true);
    };

    const handleOpenWizard = () => {
        // Use direct callback if available, otherwise fallback to dispatch
        if (onViewChange) {
            onViewChange(View.AD_CREATION);
        } else {
            window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view: 'AD_CREATION' } }));
        }
    };

    const handleCloseWizard = () => {
        if (onWizardClose) {
            onWizardClose();
        } else {
            setShowCreateWizard(false);
        }
    };

    if (viewingAd) {
        return (
            <div className="absolute inset-0 z-[100] bg-[#F5F1E9] flex flex-col animate-in slide-in-from-right duration-300 overflow-y-auto">
                {/* Header Navigation relative for back button */}
                <div className="relative">
                    <div className="absolute top-6 left-6 z-10">
                        <button onClick={() => setViewingAd(null)} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg">
                            <span className="material-icons">arrow_back</span>
                        </button>
                    </div>

                    {/* Main Image Banner */}
                    <div className="h-[350px] relative bg-neutral-900">
                        <img src={viewingAd.img} className="w-full h-full object-cover" alt={viewingAd.title} />
                        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#1A1108] to-transparent"></div>
                        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                            <div>
                                <span className="bg-[#D4AF37] text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest mb-2 inline-block shadow-lg">
                                    {viewingAd.isNew ? 'NOVO' : 'OPORTUNIDADE'}
                                </span>
                                <h2 className="text-white text-2xl font-black uppercase leading-tight shadow-black drop-shadow-md">{viewingAd.title}</h2>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 -mt-4 bg-[#F5F1E9] rounded-t-[32px] px-6 pt-8 relative z-0">
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
                            <p className="text-[10px] font-bold text-[#1A1108]/30 italic">Publicado há 2 dias</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Seller Info */}
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#1A1108]/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div onClick={() => navigateToProfile('joao_vendedor')} className="w-10 h-10 rounded-full bg-neutral-200 overflow-hidden border border-[#D4AF37]/30 cursor-pointer active:scale-95 transition-transform">
                                    <img src="https://picsum.photos/seed/seller/100" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <p onClick={() => navigateToProfile('joao_vendedor')} className="text-[11px] font-black uppercase text-[#1A1108] tracking-wide cursor-pointer hover:underline">João Vendedor</p>
                                    <div className="flex items-center gap-1">
                                        <span className="material-icons text-[10px] text-green-500">verified</span>
                                        <p className="text-[9px] font-bold text-[#1A1108]/40">Identidade verificada</p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => navigateToProfile('joao_vendedor')} className="text-[10px] font-black text-[#1A1108]/40 uppercase tracking-widest border border-[#1A1108]/10 px-3 py-1.5 rounded-lg active:scale-95 transition-transform hover:bg-black/5">Ver Perfil</button>
                        </div>

                        {/* Details Grid */}
                        <div>
                            <h3 className="text-sm font-black text-[#1A1108] uppercase tracking-wide mb-3 border-l-4 border-[#D4AF37] pl-3">Detalhes</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white p-3 rounded-xl border border-[#1A1108]/5">
                                    <p className="text-[9px] font-black text-[#1A1108]/30 uppercase tracking-widest mb-1">CATEGORIA</p>
                                    <p className="text-xs font-bold text-[#1A1108]">EQUIPAMENTOS</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-[#1A1108]/5">
                                    <p className="text-[9px] font-black text-[#1A1108]/30 uppercase tracking-widest mb-1">CONDIÇÃO</p>
                                    <p className="text-xs font-bold text-[#1A1108]">{viewingAd.isNew ? 'NOVO' : 'USADO'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <h3 className="text-sm font-black text-[#1A1108] uppercase tracking-wide mb-3 border-l-4 border-[#D4AF37] pl-3">Descrição</h3>
                            <p className="text-sm text-[#1A1108]/70 leading-relaxed font-medium">
                                {viewingAd.description || 'Produto de altíssima qualidade, ideal para vaqueiros exigentes. Estou vendendo pois adquiri um modelo mais novo. Aceito propostas decentes e trocas por algo do meu interesse. Entre em contato para mais detalhes.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Fixed Action Bar */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-[#1A1108]/5 flex gap-3 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                    <button className="w-14 h-14 rounded-xl bg-[#1A1108]/5 flex items-center justify-center text-[#1A1108]/40 active:scale-95 transition-transform">
                        <span className="material-icons">share</span>
                    </button>
                    <button onClick={() => toggleFavorite(viewingAd.title)} className={`w-14 h-14 rounded-xl bg-[#1A1108]/5 flex items-center justify-center active:scale-95 transition-transform ${favorites.includes(viewingAd.title) ? 'text-red-500' : 'text-[#1A1108]/40'}`}>
                        <span className="material-icons">{favorites.includes(viewingAd.title) ? 'favorite' : 'favorite_border'}</span>
                    </button>
                    <button
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent('arena_navigate', { 
                                detail: { 
                                    view: 'SOCIAL', 
                                    openDM: viewingAd.sellerUsername || 'joao_vendedor' 
                                } 
                            }));
                        }}
                        className="flex-1 bg-[#D4AF37] text-white rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-widest shadow-lg shadow-[#D4AF37]/20 active:scale-95 transition-transform"
                    >
                        <span className="material-icons text-lg">chat_bubble</span>
                        <span className="text-xs">Negociar no Chat</span>
                    </button>
                </div>
            </div>
        );
    }

    if (showSuccess) {
        return (
            <div className="min-h-full bg-[#F5F1E9] flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-500/20">
                    <span className="material-icons text-white text-5xl">check_circle</span>
                </div>
                <h2 className="text-3xl font-black text-[#1A1108] mb-2 uppercase italic tracking-tight">Anúncio Publicado!</h2>
                <p className="text-[#1A1108]/60 font-medium mb-10">Seu anúncio já está no ar para toda a comunidade.</p>

                <div className="w-full space-y-4">
                    <button onClick={() => { setShowSuccess(false); handleCloseWizard(); }} className="w-full bg-[#D4AF37] text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-[#D4AF37]/20">Ver Meus Anúncios</button>
                    <button onClick={() => { setShowSuccess(false); setStep(1); setAdData({ ...adData, photos: [] }); }} className="w-full bg-white border-2 border-[#D4AF37]/20 text-[#D4AF37] py-4 rounded-xl font-black uppercase tracking-widest">Criar Outro Anúncio</button>
                    <button onClick={() => { setShowSuccess(false); handleCloseWizard(); }} className="w-full text-[#1A1108]/40 py-2 font-black uppercase tracking-widest text-xs">Voltar ao Mercado</button>
                </div>
            </div>
        );
    }

    if (showConfirm) {
        return (
            <div className="min-h-full bg-[#F5F1E9] flex flex-col pb-24">
                <header className="px-6 py-6 border-b border-[#1A1108]/5 bg-white flex items-center gap-4">
                    <button onClick={() => setShowConfirm(false)} className="material-icons text-leather">arrow_back</button>
                    <h1 className="text-xl font-black uppercase italic tracking-tight">Revisar Anúncio</h1>
                </header>

                <div className="flex-1 overflow-y-auto p-6">
                    <p className="text-xs font-black text-[#1A1108]/40 uppercase tracking-[0.2em] mb-4 text-center">Confirme antes de colocar na praça</p>

                    {/* Card Preview */}
                    <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-[#1A1108]/5 mb-8">
                        <div className="aspect-square relative flex items-center justify-center bg-neutral-100">
                            {adData.photos.length > 0 ? (
                                <img src={adData.photos[0]} className="w-full h-full object-cover" alt="Cover" />
                            ) : (
                                <span className="material-icons text-6xl text-[#1A1108]/10">image</span>
                            )}
                            <div className="absolute top-4 left-4 bg-[#D4AF37] text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">PREVIEW</div>
                        </div>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-2">
                                <span className="bg-[#1A1108]/5 text-[#1A1108]/60 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">{adData.category.toUpperCase()}</span>
                                <span className="text-[#D4AF37] font-black text-xl">{adData.priceType === 'negotiable' ? 'A COMBINAR' : `R$ ${adData.price}`}</span>
                            </div>
                            <h3 className="text-2xl font-black mb-1 uppercase leading-tight">{adData.title || 'SEM TÍTULO'}</h3>
                            <div className="flex items-center gap-1 text-[#1A1108]/40 mb-4">
                                <span className="material-icons text-sm">place</span>
                                <span className="text-xs font-bold">{adData.city}, {adData.uf}</span>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-[#1A1108]/5">
                                <div>
                                    <p className="text-[10px] font-black text-[#1A1108]/40 uppercase tracking-widest mb-1">DETALHES</p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="bg-[#1A1108]/5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-[#1A1108]/80">{adData.condition}</span>
                                        {adData.category === 'horse' && <span className="bg-[#1A1108]/5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-[#1A1108]/80">{adData.horseBreed}</span>}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-[#1A1108]/40 uppercase tracking-widest mb-1">DESCRIÇÃO</p>
                                    <p className="text-sm text-[#1A1108]/70 leading-relaxed">{adData.description}</p>
                                </div>
                                <div className="bg-[#F5F1E9] p-4 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <img src="https://picsum.photos/seed/profile/100" className="w-8 h-8 rounded-full" />
                                        <div>
                                            <p className="text-[11px] font-black">{adData.contactName}</p>
                                            <p className="text-[10px] font-medium text-[#1A1108]/40">Vendedor verificado</p>
                                        </div>
                                    </div>
                                    <span className="material-icons text-[#D4AF37]">chat_bubble</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-white border-t border-[#1A1108]/5 flex gap-4">
                    <button onClick={() => setShowConfirm(false)} className="flex-1 bg-white border-2 border-[#1A1108]/10 text-leather font-black py-4 rounded-xl uppercase tracking-widest">Editar</button>
                    <button onClick={publishAd} className="flex-[2] bg-[#D4AF37] text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-lg shadow-[#D4AF37]/20">Publicar Anúncio</button>
                </div>
            </div>
        );
    }

    if (showCreateWizard) {
        return (
            <div className="absolute inset-0 z-[60] bg-[#F5F1E9] flex flex-col">
                {/* Header */}
                <header className="px-6 py-6 border-b border-[#1A1108]/5 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => { if (step > 1) setStep(step - 1); else handleCloseWizard(); }} className="material-icons text-leather">arrow_back</button>
                        <h1 className="text-xl font-black uppercase italic tracking-tight">Criar Anúncio</h1>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-[#D4AF37]">{step}</span>
                        <span className="text-[10px] font-black text-[#1A1108]/20 uppercase">/3</span>
                    </div>
                </header>

                {/* Step Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className="text-xs font-black uppercase tracking-widest text-[#1A1108]/40 mb-4 block">1. Categoria</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setAdData({ ...adData, category: cat.id })}
                                            className={`flex flex-col items-center justify-center p-6 border-2 rounded-3xl transition-all ${adData.category === cat.id ? 'border-[#D4AF37] bg-white shadow-xl shadow-[#D4AF37]/10' : 'border-[#1A1108]/5 bg-white/50 opacity-60'}`}
                                        >
                                            <span className={`material-icons text-3xl mb-2 ${adData.category === cat.id ? 'text-[#D4AF37]' : 'text-[#1A1108]/20'}`}>{cat.icon}</span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${adData.category === cat.id ? 'text-[#1A1108]' : 'text-[#1A1108]/40'}`}>{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-[#1A1108]/40 block">2. Título do anúncio</label>
                                <div className="relative">
                                    <input
                                        maxLength={60}
                                        value={adData.title}
                                        onChange={(e) => setAdData({ ...adData, title: e.target.value })}
                                        className="w-full bg-white border-2 border-[#1A1108]/5 rounded-2xl py-5 px-6 font-black text-leather uppercase tracking-tight placeholder:text-[#1A1108]/10 outline-none focus:border-[#D4AF37] transition-all"
                                        placeholder="EX: SELA PROFISSIONAL LUXO"
                                    />
                                    <span className="absolute right-6 bottom-4 text-[10px] font-black text-[#1A1108]/20">{adData.title.length}/60</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[#1A1108]/40 block pl-1">Estado</label>
                                    <select
                                        value={adData.uf}
                                        onChange={(e) => setAdData({ ...adData, uf: e.target.value, city: '' })}
                                        className="w-full bg-white border-2 border-[#1A1108]/5 rounded-2xl py-4 px-5 font-black text-[#1A1108] appearance-none outline-none focus:border-[#D4AF37]"
                                    >
                                        <option value="">Selecione o estado</option>
                                        {STATES.map(uf => (
                                            <option key={uf} value={uf}>{uf}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[#1A1108]/40 block pl-1">Cidade</label>
                                    <select
                                        disabled={!adData.uf || loadingCities}
                                        value={adData.city}
                                        onChange={(e) => setAdData({ ...adData, city: e.target.value })}
                                        className="w-full bg-white border-2 border-[#1A1108]/5 rounded-2xl py-4 px-5 font-black text-[#1A1108] appearance-none outline-none focus:border-[#D4AF37] disabled:opacity-40"
                                    >
                                        <option value="">{loadingCities ? 'Carregando...' : 'Selecione a cidade'}</option>
                                        {cities.map(city => (
                                            <option key={city.id} value={city.nome}>{city.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-[#1A1108]/5">
                                <div>
                                    <h4 className="font-black uppercase text-sm italic">É negociável?</h4>
                                    <p className="text-[10px] font-bold text-[#1A1108]/40">O comprador entrará em contato via Chat</p>
                                </div>
                                <button
                                    onClick={() => setAdData({ ...adData, priceType: adData.priceType === 'fixed' ? 'negotiable' : 'fixed' })}
                                    className={`w-14 h-8 rounded-full border-2 transition-all relative ${adData.priceType === 'negotiable' ? 'bg-[#D4AF37] border-[#D4AF37]' : 'bg-[#1A1108]/5 border-[#1A1108]/10'}`}
                                >
                                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all ${adData.priceType === 'negotiable' ? 'right-1' : 'left-1'}`}></div>
                                </button>
                            </div>

                            {adData.priceType === 'fixed' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-[#1A1108]/40 block">Preço (R$)</label>
                                    <input
                                        value={adData.price}
                                        onChange={(e) => setAdData({ ...adData, price: e.target.value })}
                                        className="w-full bg-white border-2 border-[#1A1108]/5 rounded-2xl py-5 px-6 font-black text-leather text-2xl outline-none focus:border-[#D4AF37]"
                                        placeholder="0,00"
                                        type="number"
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-[#1A1108]/40 block">Condição do item</label>
                                <div className="flex gap-2">
                                    {['NOVO', 'SEMINOVO', 'USADO'].map(cond => (
                                        <button
                                            key={cond}
                                            onClick={() => setAdData({ ...adData, condition: cond })}
                                            className={`flex-1 py-4 rounded-xl font-black text-[10px] tracking-widest transition-all ${adData.condition === cond ? 'bg-[#D4AF37] text-white shadow-lg' : 'bg-white text-[#1A1108]/40 border border-[#1A1108]/5'}`}
                                        >
                                            {cond}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-[#1A1108]/40 block">Descrição</label>
                                <textarea
                                    value={adData.description}
                                    onChange={(e) => setAdData({ ...adData, description: e.target.value })}
                                    rows={6}
                                    className="w-full bg-white border-2 border-[#1A1108]/5 rounded-2xl py-5 px-6 font-medium text-leather leading-relaxed outline-none focus:border-[#D4AF37]"
                                    placeholder="Conte detalhes sobre o item, motivo da venda e estado de conservação..."
                                />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-[#1A1108]/40 block mb-1">Fotos do anúncio</label>
                                    <p className="text-[10px] font-bold text-[#1A1108]/30 italic mb-4">Fotos claras vendem muito mais!</p>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    {adData.photos.map((photo, i) => (
                                        <div key={i} className="aspect-square relative rounded-2xl overflow-hidden shadow-lg border-2 border-white">
                                            <img src={photo} className="w-full h-full object-cover" />
                                            {i === 0 && <div className="absolute top-1 left-1 bg-[#D4AF37] text-white p-1 rounded-full"><span className="material-icons text-[10px]">star</span></div>}
                                            <button
                                                onClick={() => setAdData({ ...adData, photos: adData.photos.filter((_, idx) => idx !== i) })}
                                                className="absolute top-1 right-1 bg-black/40 text-white p-1 rounded-full backdrop-blur-md"
                                            >
                                                <span className="material-icons text-[10px]">close</span>
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={handlePhotoUpload}
                                        className="aspect-square rounded-2xl border-2 border-dashed border-[#1A1108]/10 bg-white/50 flex flex-col items-center justify-center text-[#1A1108]/20 hover:text-[#D4AF37] hover:border-[#D4AF37] transition-all"
                                    >
                                        <span className="material-icons text-3xl mb-1">add_a_photo</span>
                                        <span className="text-[8px] font-black uppercase tracking-widest">Adicionar</span>
                                    </button>
                                                            <div className="bg-white rounded-3xl p-6 border border-[#1A1108]/5 space-y-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-icons text-[#D4AF37]">chat_bubble</span>
                                    <h4 className="font-black uppercase text-xs">Abertura de Negociação</h4>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-[#1A1108]/40 uppercase tracking-widest pl-1">Identificação no anúncio</label>
                                        <input className="w-full bg-[#F5F1E9] border-none rounded-xl py-3 px-4 font-bold text-sm text-[#1A1108]" value={adData.contactName} readOnly />
                                    </div>
                                    <div className="bg-[#F5F1E9] p-4 rounded-xl">
                                        <p className="text-[10px] font-bold text-[#1A1108]/60 leading-relaxed italic">
                                            Atenção: Por segurança, todas as conversas agora ocorrem dentro do app. Você receberá notificações de novos interessados.
                                        </p>
                                    </div>
                                </div>
                            </div>    </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Navigation */}
                <div className="flex-none p-6 pb-8 bg-white border-t border-[#1A1108]/5 flex gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                    {step < 3 ? (
                        <button
                            disabled={step === 1 && !adData.category}
                            onClick={() => setStep(step + 1)}
                            className="w-full bg-[#D4AF37] text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-lg shadow-[#D4AF37]/20 disabled:opacity-50 active:scale-[0.98] transition-all"
                        >
                            Próximo Passo
                        </button>
                    ) : (
                        <button
                            disabled={adData.photos.length === 0}
                            onClick={() => setShowConfirm(true)}
                            className="w-full bg-[#1A1108] text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-lg disabled:opacity-50 active:scale-[0.98] transition-all"
                        >
                            Revisar Anúncio
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-[#F5F1E9] text-[#1A1108]">
            <header className="px-6 py-8">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <span className="material-icons text-[#D4AF37] text-3xl">storefront</span>
                        <div>
                            <h1 className="text-3xl font-black italic uppercase tracking-tight leading-none">MERCADO</h1>
                            <p className="text-[10px] font-black uppercase text-[#D4AF37] tracking-[0.3em] mt-1">+VAQUEJADA</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleOpenWizard}
                            className="w-12 h-12 rounded-full bg-[#1A1108] shadow-lg border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] active:scale-95 transition-transform"
                        >
                            <span className="material-icons text-xl">add</span>
                        </button>
                        <button className="w-12 h-12 rounded-full bg-white shadow-lg border border-[#1A1108]/5 flex items-center justify-center active:scale-95 transition-transform">
                            <span className="material-icons text-[#1A1108]/40">search</span>
                        </button>
                    </div>
                </div>

                {/* Roller de Anunciantes (Same as Events View) */}
                <div className="relative mb-6 h-28 w-full overflow-hidden rounded-2xl border border-[#1A1108]/5 bg-white shadow-sm">
                    {MOCK_ADVERTISERS.map((ad, idx) => (
                        <div
                            key={ad.id}
                            className={`absolute inset-0 transition-opacity duration-1000 flex items-center justify-center ${idx === adIndex ? 'opacity-100' : 'opacity-0'}`}
                        >
                            <img src={ad.img} className="w-full h-full object-cover" alt={ad.name} />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em] text-center">{ad.name}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                    {FILTER_TAGS.map((tag) => (
                        <button 
                            key={tag.id} 
                            onClick={() => setActiveCategoryId(tag.id)}
                            className={`px-5 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all ${activeCategoryId === tag.id ? 'bg-[#D4AF37] text-white shadow-lg shadow-[#D4AF37]/20' : 'bg-white text-[#1A1108]/40 border border-[#1A1108]/5'}`}
                        >
                            {tag.label}
                        </button>
                    ))}
                </div>
            </header>

            <main className="px-6 pb-32 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    {/* Ad Cards */}
                    {[
                        ...publishedAds,
                        ...MOCK_MARKET_ITEMS
                    ].filter(item => {
                        if (activeCategoryId === 'all') return true;
                        return item.category === activeCategoryId;
                    }).map((item, i) => (
                        <div onClick={() => setViewingAd(item)} key={i} className="bg-white rounded-[24px] overflow-hidden shadow-xl shadow-black/5 border border-[#1A1108]/5 group active:scale-[0.98] transition-all">
                            <div className="aspect-square relative overflow-hidden bg-neutral-100">
                                <img src={item.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.title} />
                                {item.isNew && (
                                    <div className="absolute top-3 left-3 bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest shadow-lg">NOVO</div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                            <div className="p-4">
                                <p className="text-[14px] font-black text-[#D4AF37] leading-none mb-1.5">{item.price}</p>
                                <h3 className="text-[11px] font-black uppercase tracking-tight line-clamp-1 mb-2 leading-tight">{item.title}</h3>
                                <div className="flex items-center gap-1 opacity-20">
                                    <span className="material-icons text-[10px]">place</span>
                                    <span className="text-[9px] font-bold uppercase">{item.loc}</span>
                                </div>
                            </div>
                        </div>
                    ))}

                </div>
            </main>
        </div>
    );
};

export default MarketView;
