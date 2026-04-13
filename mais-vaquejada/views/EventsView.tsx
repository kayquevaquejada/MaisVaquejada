
import React, { useState, useEffect } from 'react';
import { EventItem, Circuito } from '../types';
import { supabase } from '../lib/supabase';
import AdsCarousel from '../components/AdsCarousel';


const MOCK_CIRCUITS: Circuito[] = [
  { id: 'todos', nome: 'Todos os circuitos', slug: 'todos', ativo: true, destaque: true, ordem: 0 },
  { id: 'alqm', nome: 'ALQM', slug: 'alqm', ativo: true, destaque: true, ordem: 1 },
  { id: 'pe-pb', nome: 'PE-PB', slug: 'pe-pb', ativo: true, destaque: true, ordem: 2 },
  { id: 'nacional-byd', nome: 'Nacional BYD', slug: 'nacional-byd', ativo: true, destaque: true, ordem: 3 },
  { id: 'portal', nome: 'Portal', slug: 'portal', ativo: true, destaque: false, ordem: 4 },
  { id: 'apqm', nome: 'APQM', slug: 'apqm', ativo: true, destaque: false, ordem: 5 },
  { id: 'derby', nome: 'Derby', slug: 'derby', ativo: true, destaque: false, ordem: 6 },
  { id: 'xaramego', nome: 'Xaramego', slug: 'xaramego', ativo: true, destaque: false, ordem: 7 },
  { id: 'circuito-dos-campeoes', nome: 'Circuito dos Campeões', slug: 'circuito-dos-campeoes', ativo: true, destaque: false, ordem: 8 },
  { id: 'regional-nordeste', nome: 'Regional Nordeste', slug: 'regional-nordeste', ativo: true, destaque: false, ordem: 9 }
];

const INITIAL_EVENTS: EventItem[] = [
  {
    id: '1',
    title: 'Grande Vaquejada de Surubim',
    location: 'Surubim, PE',
    park: 'Parque J. Galdino',
    price: 'R$ 450,00',
    category: 'Inicial',
    date: { month: 'SET', day: '15' },
    imageUrl: 'https://picsum.photos/seed/event1/800/600',
    site: 'www.vaquejadasurubim.com.br',
    instagram: '@vaquejadasurubim',
    phone: '(81) 99999-9999',
    prizes: 'R$ 200.000,00 em prêmios + 2 Motos 0km',
    description: 'A maior vaquejada do Brasil está de volta! Venha viver a emoção de derrubar o boi na faixa e curtir grandes shows.',
    circuitoId: 'pe-pb'
  },
  {
    id: '2',
    title: 'Circuito Portal Vaquejada',
    location: 'Bezerros, PE',
    park: 'Parque Rufina Borba',
    price: 'R$ 800,00',
    category: 'Profissional',
    date: { month: 'OUT', day: '02' },
    imageUrl: 'https://picsum.photos/seed/event2/800/600',
    site: 'www.portalvaquejada.com.br',
    instagram: '@portalvaquejada',
    phone: '(81) 98888-8888',
    prizes: 'R$ 300.000,00 em prêmios',
    description: 'Etapa decisiva do campeonato portal. Os melhores vaqueiros do Brasil reunidos em um só lugar.',
    circuitoId: 'portal'
  },
  {
    id: '3',
    title: 'Vaquejada de Serrinha',
    location: 'Serrinha, BA',
    park: 'Parque Maria do Carmo',
    price: 'R$ 500,00',
    category: 'Amador',
    date: { month: 'NOV', day: '10' },
    imageUrl: 'https://picsum.photos/seed/event3/800/600',
    site: 'www.vaquejadaserrinha.com.br',
    instagram: '@vaquejadaserrinhaoficial',
    phone: '(75) 97777-7777',
    prizes: 'R$ 150.000,00',
    description: 'A festa do gado na Bahia! Tradição e modernidade se encontram em Serrinha.',
    circuitoId: 'nacional-byd'
  },
  {
    id: '4',
    title: 'Vaquejada de Mossoró',
    location: 'Mossoró, RN',
    park: 'Porcino Park Center',
    price: 'R$ 350,00',
    category: 'Aspirante',
    date: { month: 'DEZ', day: '05' },
    imageUrl: 'https://picsum.photos/seed/event4/800/600',
    site: 'www.porcinopark.com.br',
    instagram: '@porcinopark',
    phone: '(84) 96666-6666',
    prizes: 'R$ 100.000,00',
    description: 'O grande encontro do Rio Grande do Norte. Vaquejada com padrão de qualidade Porcino Park.'
  }
];

const STATES = [
  'TODOS', 'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO',
  'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
];

const MOCK_ADVERTISERS = [
  { id: '1', name: 'Haras PFF', img: 'https://picsum.photos/seed/haras1/800/200' },
  { id: '2', name: 'Integral Mix', img: 'https://picsum.photos/seed/haras2/800/200' },
  { id: '3', name: 'Organnact', img: 'https://picsum.photos/seed/haras3/800/200' },
  { id: '4', name: 'Vaquejada do Sertão', img: 'https://picsum.photos/seed/haras4/800/200' },
];

interface EventsViewProps {
  publicEventId?: string;
  onLoginPrompt?: () => void;
}

const EventsView: React.FC<EventsViewProps> = ({ publicEventId, onLoginPrompt }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>(MOCK_ADVERTISERS);
  const [selectedState, setSelectedState] = useState('TODOS');
  const [selectedCircuit, setSelectedCircuit] = useState('todos');
  const [isCircuitPanelOpen, setIsCircuitPanelOpen] = useState(false);
  const [viewingEvent, setViewingEvent] = useState<EventItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [adIndex, setAdIndex] = useState(0);
  const [bannerHeight, setBannerHeight] = useState(140); 
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('arena_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});

  // Sync with public event from URL
  useEffect(() => {
    if (publicEventId && events.length > 0) {
      const publicEv = events.find(e => String(e.id) === String(publicEventId));
      if (publicEv) setViewingEvent(publicEv);
    }
  }, [publicEventId, events]);

  useEffect(() => {
    localStorage.setItem('arena_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    const fetchBannersAndSettingsAndEvents = async () => {
      try {
        // Fetch Banners
        const { data: bannersData } = await supabase.from('banners').select('*').eq('status', 'active');
        if (bannersData && bannersData.length > 0) setBanners(bannersData);

        // Fetch Height
        const { data: heightData } = await supabase.from('app_settings').select('value').eq('key', 'banner_height').single();
        if (heightData?.value?.value) setBannerHeight(heightData.value.value);
        
        // Fetch Live Events
        const { data: eventsData } = await supabase.from('events').select('*').eq('is_paused', false).order('created_at', { ascending: false });
        if (eventsData) {
            setEvents(eventsData.map(ev => ({
                ...ev,
                imageUrl: ev.image_url,
                date: { month: ev.date_month, day: ev.date_day }
            })));

            // Fetch Real Likes for these events
            const { data: likesData } = await supabase.from('event_likes').select('event_id');
            const counts: Record<string, number> = {};
            likesData?.forEach(lk => {
                counts[lk.event_id] = (counts[lk.event_id] || 0) + 1;
            });
            setLikesCount(counts);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchBannersAndSettingsAndEvents();
  }, []);

  // Banner auto-scroll logic removed to rely on AdsCarousel component


  const toggleFavorite = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    // Optimistic UI toggle for Favorites (Local Star)
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );

    // Save Real Like to Database
    const isAdding = !favorites.includes(id);
    try {
        if (isAdding) {
            await supabase.from('event_likes').insert({ event_id: id, user_id: (await supabase.auth.getUser()).data.user?.id }).then();
            setLikesCount(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
        } else {
            await supabase.from('event_likes').delete().eq('event_id', id).eq('user_id', (await supabase.auth.getUser()).data.user?.id).then();
            setLikesCount(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) - 1) }));
        }
    } catch (err) {
        // Silently handle if not logged in or other issues
    }
  };

  const handleShare = async (event: EventItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    const shareUrl = `${window.location.origin}/?event=${event.id}`;
    const shareText = `🏇 Convite Vaquerama!\n\nVenha ver o evento: *${event.title.toUpperCase()}*\n📍 No ${event.park}, ${event.location}\n\nConfira todos os detalhes no app:`;

    if (navigator.share) {
        try {
            await navigator.share({
                title: event.title,
                text: shareText,
                url: shareUrl,
            });
        } catch (err) {
            console.log('User cancelled share or error:', err);
        }
    } else {
        // Fallback for browsers without Web Share
        const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`;
        window.open(waUrl, '_blank');
    }
  };

  const handleComment = (comment: string) => {
    alert(`Comentário enviado: "${comment}"`);
  };

  const filteredEvents = (events || []).filter(e => {
    if (!e) return false;
    const location = e.location || '';
    const title = e.title || '';
    const circuitoId = e.circuitoId || '';

    const matchesState = selectedState === 'TODOS' || location.includes(selectedState);
    const matchesSearch = searchQuery === '' ||
      location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCircuit = selectedCircuit === 'todos' || circuitoId === selectedCircuit;
    
    return matchesState && matchesSearch && matchesCircuit;
  });

    // Detail View Overlay
    if (viewingEvent) {
        const isFav = favorites.includes(viewingEvent.id);
        const [activeImgIndex, setActiveImgIndex] = useState(0);
        const [zoomImg, setZoomImg] = useState<string | null>(null);
        
        // Combine cover + gallery
        const allImages = [
            viewingEvent.imageUrl,
            ...(Array.isArray((viewingEvent as any).gallery) ? (viewingEvent as any).gallery : [])
        ].filter(Boolean);

        return (
            <div className="absolute inset-0 z-[100] flex justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="w-full max-w-[480px] h-full bg-background-dark relative overflow-y-auto hide-scrollbar shadow-2xl animate-in slide-in-from-bottom-10 duration-300">

                    {/* Header Image Gallery (Swipeable) */}
                    <div className="relative h-[480px] bg-black group">
                        <div 
                            className="w-full h-full flex transition-transform duration-500 ease-out"
                            style={{ transform: `translateX(-${activeImgIndex * 100}%)` }}
                        >
                            {allImages.map((img, i) => (
                                <div 
                                    key={i} 
                                    className="w-full h-full flex-shrink-0 cursor-zoom-in"
                                    onClick={() => setZoomImg(img)}
                                >
                                    <img src={img} className="w-full h-full object-cover" alt={`Banner ${i}`} />
                                </div>
                            ))}
                        </div>
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-black/40 pointer-events-none"></div>

                        {/* Gallery Indicators */}
                        {allImages.length > 1 && (
                            <div className="absolute bottom-32 left-0 right-0 flex justify-center gap-2 z-10">
                                {allImages.map((_, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => setActiveImgIndex(i)}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${activeImgIndex === i ? 'w-6 bg-[#D4AF37]' : 'w-1.5 bg-white/40'}`}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Swipe Navigation Hints (Desktop or Manual) */}
                        {allImages.length > 1 && activeImgIndex > 0 && (
                            <button onClick={() => setActiveImgIndex(prev => prev - 1)} className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/60 hover:text-white z-10">
                                <span className="material-icons">chevron_left</span>
                            </button>
                        )}
                        {allImages.length > 1 && activeImgIndex < allImages.length - 1 && (
                            <button onClick={() => setActiveImgIndex(prev => prev + 1)} className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/60 hover:text-white z-10">
                                <span className="material-icons">chevron_right</span>
                            </button>
                        )}

                        {/* Navbar Controls */}
                        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20">
                            <button onClick={() => {
                                if (publicEventId) window.history.pushState({}, '', '/');
                                setViewingEvent(null);
                            }} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-95 transition-transform">
                                <span className="material-icons">arrow_back</span>
                            </button>
                            <div className="flex gap-2">
                                <button onClick={() => handleShare(viewingEvent)} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-95 transition-transform">
                                    <span className="material-icons">share</span>
                                </button>
                                <div className="flex flex-col items-center">
                                    <button onClick={() => toggleFavorite(viewingEvent.id)} className={`w-10 h-10 rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-95 transition-transform ${isFav ? 'bg-[#D4AF37] text-black' : 'bg-black/40 text-white'}`}>
                                        <span className="material-icons">{isFav ? 'favorite' : 'favorite_border'}</span>
                                    </button>
                                    <span className="text-[9px] font-black text-white/40 mt-1">{likesCount[viewingEvent.id] || 0} curtiu</span>
                                </div>
                            </div>
                        </div>

                        {/* Hero Info Overlay (Integrated into Detail page flow better) */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 pt-20 bg-gradient-to-t from-background-dark to-transparent pointer-events-none">
                            <div className="flex flex-wrap gap-2 mb-3">
                                <span className="bg-[#D4AF37] text-background-dark text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest shadow-lg">
                                    {viewingEvent.category}
                                </span>
                                {viewingEvent.circuitoId && (
                                    <span className="bg-white/10 border border-[#D4AF37]/30 text-[#D4AF37] text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest backdrop-blur-md">
                                        Circuito {MOCK_CIRCUITS.find(c => c.id === viewingEvent.circuitoId)?.nome}
                                    </span>
                                )}
                            </div>
                            <h1 className="text-3xl font-black uppercase leading-tight mb-2 text-white drop-shadow-2xl">{viewingEvent.title}</h1>
                            <div className="flex items-center gap-2 text-white/90">
                                <span className="material-icons text-[#D4AF37] text-sm">place</span>
                                <span className="text-sm font-bold uppercase tracking-wide">{viewingEvent.location}</span>
                            </div>
                        </div>
                    </div>

                    {/* Pinch-to-Zoom Viewer Component */}
                    {zoomImg && (
                        <div 
                            className="fixed inset-0 z-[150] bg-black flex items-center justify-center animate-in fade-in zoom-in-95 duration-200"
                            onClick={() => setZoomImg(null)}
                        >
                            <div className="absolute top-8 right-6 z-[160]">
                                <button className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
                                    <span className="material-icons">close</span>
                                </button>
                            </div>
                            <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                <img 
                                    src={zoomImg} 
                                    className="max-w-full max-h-full object-contain select-none"
                                    style={{ touchAction: 'none' }} // Crucial para o pinch no mobile
                                    onClick={(e) => e.stopPropagation()}
                                    onLoad={(e) => {
                                        // TODO: Implementar pinch detection básico via touch events se necessário
                                        // Mas navegadores modernos já facilitam o pinch em viewport controlada
                                    }}
                                />
                            </div>
                            <p className="absolute bottom-12 text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Arraste com 2 dedos para zoom</p>
                        </div>
                    )}

          <div className="px-6 pb-32 space-y-8 -mt-2 relative z-10">
            {/* Quick Info Bar */}
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-4 -mx-6 px-6">
              <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl flex-shrink-0 min-w-[120px]">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Valor Senha</p>
                <p className="text-base font-black text-[#D4AF37]">{viewingEvent.price}</p>
              </div>
              <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl flex-shrink-0 min-w-[100px]">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Data</p>
                <p className="text-base font-black text-white">{viewingEvent.date.day} <span className="text-sm opacity-60">{viewingEvent.date.month}</span></p>
              </div>
              {viewingEvent.phone && (
                <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl flex-shrink-0 min-w-[140px]">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Contato</p>
                  <p className="text-base font-black text-white">{viewingEvent.phone}</p>
                </div>
              )}
              {/* Espaçador final para garantir que o scroll não cole na bordinha */}
              <div className="w-1 flex-shrink-0"></div>
            </div>

            {/* Prizes */}
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide mb-4 flex items-center gap-2 text-white">
                <span className="w-1 h-4 bg-[#D4AF37] rounded-full"></span>
                Premiação
              </h3>
              <div className="bg-gradient-to-r from-[#D4AF37]/20 to-transparent p-6 rounded-2xl border border-[#D4AF37]/20 relative overflow-hidden">
                <span className="material-icons absolute -right-4 -bottom-4 text-[100px] text-[#D4AF37]/10 rotate-12">emoji_events</span>
                <p className="text-2xl font-black text-[#D4AF37] relative z-10">{viewingEvent.prizes}</p>
                <p className="text-xs font-bold text-[#D4AF37]/60 uppercase tracking-widest mt-1 relative z-10">Premiação Total Garantida</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide mb-4 flex items-center gap-2 text-white">
                <span className="w-1 h-4 bg-[#D4AF37] rounded-full"></span>
                Detalhes
              </h3>
              <p className="text-sm text-white/70 leading-relaxed font-medium text-justify">
                {viewingEvent.description}
              </p>
            </div>

            {/* Links */}
            <div className="space-y-3">
              {viewingEvent.instagram && (
                <a href={`https://instagram.com/${viewingEvent.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10 active:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="material-icons text-white/60">photo_camera</span>
                    <div>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Instagram</p>
                      <p className="text-sm font-bold text-white">{viewingEvent.instagram}</p>
                    </div>
                  </div>
                  <span className="material-icons text-white/20">open_in_new</span>
                </a>
              )}
              {viewingEvent.site && (
                <a href={`https://${viewingEvent.site}`} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10 active:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="material-icons text-white/60">language</span>
                    <div>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Site Oficial</p>
                      <p className="text-sm font-bold text-white truncate max-w-[150px]">{viewingEvent.site}</p>
                    </div>
                  </div>
                  <span className="material-icons text-white/20">open_in_new</span>
                </a>
              )}
            </div>

          </div>

          {/* Sticky Bottom Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-dark via-background-dark to-transparent z-20">
            {onLoginPrompt && !localStorage.getItem('supabase.auth.token') ? (
              <button onClick={onLoginPrompt} className="w-full bg-[#ECA413] text-background-dark font-black py-4 rounded-xl uppercase tracking-widest shadow-lg shadow-[#ECA413]/20 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <span className="material-icons">login</span>
                Entrar para Confirmar
              </button>
            ) : (
                <button onClick={() => handleComment("Eu vou!!")} className="w-full bg-[#ECA413] text-background-dark font-black py-4 rounded-xl uppercase tracking-widest shadow-lg shadow-[#ECA413]/20 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                    <span className="material-icons">check_circle</span>
                    Confirmar Presença
                </button>
            )}
            {!localStorage.getItem('supabase.auth.token') && (
                <p className="text-[10px] text-white/30 text-center mt-3 font-bold uppercase tracking-widest">Veja mais conteúdos no app oficial</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main List View (Horizontal Scroll + Vertical List)
  return (
    <div className="px-6 py-6 pb-24 min-h-full bg-background-dark">
      <header className="mb-6 -mx-6 px-6">
        <div className="flex justify-between items-center mb-6">
          {!isSearchOpen ? (
            <div className="flex flex-col">
              <h1 className="text-2xl font-black uppercase text-[#D4AF37] tracking-tighter italic">VAQUEJADAS</h1>
              <div className="bg-green-600 text-white text-[10px] px-2 py-0.5 rounded font-black mt-1">SOU A TELA DE EVENTOS (HOME)</div>
            </div>
          ) : (
            <div className="flex-1 mr-4 relative animate-in slide-in-from-right-2 duration-300">
              <input
                type="text"
                autoFocus
                placeholder="Buscar cidade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 border border-[#D4AF37]/30 rounded-full py-2 px-4 text-sm text-white outline-none"
              />
              <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 material-icons text-white/40 text-sm">close</button>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${isSearchOpen ? 'bg-[#D4AF37] border-[#D4AF37] text-background-dark' : 'bg-white/5 border-white/10 text-[#D4AF37]'}`}
            >
              <span className="material-icons text-xl">{isSearchOpen ? 'search_off' : 'search'}</span>
            </button>
          </div>

        </div>

        {/* Novo Módulo de Publicidade ADM */}
        <div className="-mx-6 border-b border-white/5 pb-4 mb-2">
            <AdsCarousel targetPosition="vaquejada_top_carousel" />
        </div>


        {/* Horizontal Scrollable States */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          {STATES.map((uf, idx) => {
            // Insere o botão Circuitos logo após 'TODOS' (que é idx === 0), ou seja, quando for renderizar o 'AC' eu jogo o botão antes nele ou trato o map
            const btnState = (
              <button
                key={uf}
                onClick={() => setSelectedState(uf)}
                className={`px-6 py-2.5 rounded-full font-black text-[11px] uppercase tracking-widest whitespace-nowrap transition-all border ${selectedState === uf ? 'bg-[#D4AF37] border-[#D4AF37] text-background-dark shadow-lg shadow-[#D4AF37]/20' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
              >
                {uf}
              </button>
            );

            if (idx === 1) { // Injetar Circuitos logo após 'TODOS'
              const isActive = selectedCircuit !== 'todos';
              const label = isActive ? 'CIRCUITO ATIVO' : 'CIRCUITOS';
              const btnCircuit = (
                <button
                  key="circuitos-btn"
                  onClick={() => setIsCircuitPanelOpen(true)}
                  className={`px-6 py-2.5 rounded-full font-black text-[11px] uppercase tracking-widest whitespace-nowrap transition-all border ${isActive ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37] shadow-lg shadow-[#D4AF37]/20' : 'bg-white/5 border-white/10 text-[#D4AF37] hover:bg-white/10'}`}
                >
                  {label}
                </button>
              );
              return <React.Fragment key={`frag-${uf}`}>{btnCircuit}{btnState}</React.Fragment>;
            }

            return btnState;
          })}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((event) => {
            const isFav = favorites.includes(event.id);
            return (
              <div key={event.id} className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden shadow-xl group">
                <div className="relative h-64">
                  <img src={event.imageUrl} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500" alt={event.title} />
                  <div className="absolute top-4 left-4 bg-[#D4AF37] px-3 py-1 rounded text-[10px] font-black text-background-dark flex items-center gap-1 shadow-lg">
                    <span className="material-icons text-[14px]">verified</span> OFICIAL
                  </div>
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md rounded-xl p-2.5 text-center min-w-[50px] border border-white/10 shadow-lg">
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest leading-none mb-0.5">{event.date.month}</p>
                    <p className="text-xl font-black text-white leading-none">{event.date.day}</p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-background-dark to-transparent opacity-80"></div>

                  <div className="absolute bottom-6 left-6 right-6">
                    <h3 className="text-2xl font-black mb-1 font-display text-white leading-tight">{event.title}</h3>
                    <div className="flex items-center gap-1 text-[#D4AF37]">
                      <span className="material-icons text-sm">place</span>
                      <span className="text-xs font-medium uppercase tracking-wide">{event.location} • {event.park}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-white/[0.02]">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">VALOR DA SENHA</p>
                      <p className="text-xl font-black text-[#D4AF37]">{event.price} <span className="text-xs font-normal text-white/40">/{event.category}</span></p>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <button
                            onClick={(e) => toggleFavorite(event.id, e)}
                            className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-colors ${isFav ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                        >
                            <span className="material-icons">{isFav ? 'favorite' : 'favorite_border'}</span>
                        </button>
                        <span className="text-[8px] font-black text-white/20 mt-1 uppercase tracking-widest">{likesCount[event.id] || 0}</span>
                      </div>
                      <button
                        onClick={(e) => handleShare(event, e)}
                        className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-white/40 hover:text-white transition-colors"
                      >
                        <span className="material-icons">share</span>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setViewingEvent(event)}
                    className="w-full bg-[#D4AF37] text-background-dark font-black py-4 rounded-2xl flex items-center justify-center gap-2 uppercase tracking-widest shadow-lg shadow-[#D4AF37]/20 active:scale-[0.98] transition-all hover:bg-[#c5a028]"
                  >
                    VER DETALHES <span className="material-icons text-lg">arrow_forward</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-20 opacity-40">
            <span className="material-icons text-5xl mb-4 text-[#D4AF37]/50">event_busy</span>
            <p className="font-bold uppercase tracking-widest text-[#D4AF37]">Nenhuma vaquejada encontrada</p>
            <p className="text-xs mt-2 text-white/60">Tente alterar o estado ou limpar o filtro de circuito.</p>
            {selectedCircuit !== 'todos' && (
              <button 
                onClick={() => setSelectedCircuit('todos')}
                className="mt-6 px-6 py-2.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                Limpar Circuito
              </button>
            )}
          </div>
        )}
      </div>

      {/* Circuitos Panel Modal */}
      {isCircuitPanelOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center items-end sm:items-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md bg-background-dark rounded-t-[32px] sm:rounded-3xl border sm:border-white/10 border-t border-white/10 p-6 pt-4 relative animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] max-h-[85vh] flex flex-col">
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 shrink-0 sm:hidden" />
            
            <div className="flex justify-between items-center mb-2 shrink-0">
              <h2 className="text-xl font-black uppercase text-white tracking-wide">Circuitos</h2>
              <button onClick={() => setIsCircuitPanelOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-colors">
                <span className="material-icons text-sm">close</span>
              </button>
            </div>
            <p className="text-xs text-white/40 font-bold uppercase tracking-widest mb-6 shrink-0">
              Selecione um circuito para visualizar as vaquejadas vinculadas.
            </p>
            
            <div className="overflow-y-auto hide-scrollbar flex-1 -mx-2 px-2 pb-6">
              <div className="flex flex-col gap-2">
                {MOCK_CIRCUITS.map((circuito) => {
                  const isSelected = selectedCircuit === circuito.id;
                  return (
                    <button
                      key={circuito.id}
                      onClick={() => {
                        setSelectedCircuit(circuito.id);
                        setIsCircuitPanelOpen(false);
                      }}
                      className={`px-5 py-4 rounded-2xl text-sm font-black tracking-wide transition-all border text-left flex justify-between items-center ${isSelected ? 'bg-[#D4AF37] border-[#D4AF37] text-background-dark shadow-lg shadow-[#D4AF37]/20' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'}`}
                    >
                      {circuito.nome}
                      {isSelected && <span className="material-icons text-background-dark">check_circle</span>}
                      {!isSelected && circuito.destaque && circuito.id !== 'todos' && <span className="material-icons text-[#D4AF37] text-[18px]">star</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EventsView;
