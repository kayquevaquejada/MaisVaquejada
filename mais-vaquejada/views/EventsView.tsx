import React, { useState, useEffect } from 'react';
import { EventItem, Circuito, View } from '../types';
import { supabase } from '../lib/supabase';
import AdsCarousel from '../components/AdsCarousel';
import EventModal from '../components/EventModal';
import CircuitPanel from '../components/CircuitPanel';

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
  }
];

const STATES = [
  'TODOS', 'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO',
  'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
];

interface EventsViewProps {
  publicEventId?: string;
  onLoginPrompt?: () => void;
}

const EventsView: React.FC<EventsViewProps> = ({ publicEventId, onLoginPrompt }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedState, setSelectedState] = useState('TODOS');
  const [selectedCircuit, setSelectedCircuit] = useState('todos');
  const [isCircuitPanelOpen, setIsCircuitPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('arena_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});

  useEffect(() => {
    if (publicEventId && events.length > 0) {
      const publicEv = events.find(e => String(e.id) === String(publicEventId));
      if (publicEv) {
        window.dispatchEvent(new CustomEvent('arena_navigate', { 
          detail: { view: View.EVENT_DETAILS, event: publicEv } 
        }));
      }
    }
  }, [publicEventId, events]);

  useEffect(() => {
    localStorage.setItem('arena_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: eventsData } = await supabase.from('events').select('*').eq('is_paused', false).order('created_at', { ascending: false });
        if (eventsData) {
            const mapped = eventsData.map(ev => ({
                ...ev,
                imageUrl: ev.image_url,
                date: { month: ev.date_month, day: ev.date_day }
            }));
            setEvents(mapped.length > 0 ? mapped : INITIAL_EVENTS);

            const { data: likesData } = await supabase.from('event_likes').select('event_id');
            const counts: Record<string, number> = {};
            likesData?.forEach(lk => {
                counts[lk.event_id] = (counts[lk.event_id] || 0) + 1;
            });
            setLikesCount(counts);
        } else {
            setEvents(INITIAL_EVENTS);
        }
      } catch (err) {
        setEvents(INITIAL_EVENTS);
      }
    };
    fetchData();
  }, []);

  const toggleFavorite = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites(prev => prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            if (!favorites.includes(id)) {
                await supabase.from('event_likes').insert({ event_id: id, user_id: user.id });
                setLikesCount(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
            } else {
                await supabase.from('event_likes').delete().eq('event_id', id).eq('user_id', user.id);
                setLikesCount(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) - 1) }));
            }
        }
    } catch (err) {}
  };

  const handleShare = async (event: EventItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const shareUrl = `${window.location.origin}/?event=${event.id}`;
    if (navigator.share) {
        await navigator.share({ title: event.title, url: shareUrl }).catch(() => {});
    } else {
        await navigator.clipboard.writeText(shareUrl);
        alert('Copiado!');
    }
  };

  const filteredEvents = (events || []).filter(e => {
    if (!e) return false;
    const location = (e.location || '').toUpperCase();
    const title = (e.title || '').toLowerCase();
    const matchesState = selectedState === 'TODOS' || location.includes(selectedState);
    const matchesSearch = searchQuery === '' || location.toLowerCase().includes(searchQuery.toLowerCase()) || title.includes(searchQuery.toLowerCase());
    const matchesCircuit = selectedCircuit === 'todos' || e.circuitoId === selectedCircuit;
    return matchesState && matchesSearch && matchesCircuit;
  });

  const handleCardClick = (event: EventItem) => {
    window.dispatchEvent(new CustomEvent('arena_navigate', { 
      detail: { view: View.EVENT_DETAILS, event: event } 
    }));
  };

  return (
    <div className="px-6 py-6 pb-24 min-h-full bg-background-dark">
      <header className="mb-6 -mx-6 px-6">
        <div className="flex justify-between items-center mb-6">
          {!isSearchOpen ? (
            <div className="flex flex-col">
              <h1 className="text-2xl font-black uppercase text-[#D4AF37] tracking-tighter italic">VAQUEJADAS</h1>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Eventos e Circuitos</p>
            </div>
          ) : (
            <div className="flex-1 mr-4 relative animate-in slide-in-from-right-2 duration-300">
              <input
                type="text" autoFocus placeholder="Buscar cidade..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 border border-[#D4AF37]/30 rounded-full py-2 px-4 text-sm text-white outline-none"
              />
              <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 material-icons text-white/40 text-sm">close</button>
            </div>
          )}
          <button onClick={() => setIsSearchOpen(!isSearchOpen)} className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${isSearchOpen ? 'bg-[#D4AF37] border-[#D4AF37] text-background-dark' : 'bg-white/5 border-white/10 text-[#D4AF37]'}`}>
            <span className="material-icons text-xl">{isSearchOpen ? 'search_off' : 'search'}</span>
          </button>
        </div>

        <div className="-mx-6 border-b border-white/5 pb-4 mb-2">
            <AdsCarousel key="vaquejada_top_ads" targetPosition="vaquejada_top_carousel" />
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          {STATES.map((uf, idx) => (
             <React.Fragment key={uf}>
               {idx === 1 && (
                 <button onClick={() => setIsCircuitPanelOpen(true)} className={`px-6 py-2.5 rounded-full font-black text-[11px] uppercase tracking-widest whitespace-nowrap transition-all border ${selectedCircuit !== 'todos' ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-white/5 border-white/10 text-[#D4AF37]'}`}>
                   {selectedCircuit !== 'todos' ? 'CIRCUITO ATIVO' : 'CIRCUITOS'}
                 </button>
               )}
               <button onClick={() => setSelectedState(uf)} className={`px-6 py-2.5 rounded-full font-black text-[11px] uppercase tracking-widest whitespace-nowrap transition-all border ${selectedState === uf ? 'bg-[#D4AF37] border-[#D4AF37] text-background-dark' : 'bg-white/5 border-white/10 text-white/40'}`}>
                 {uf}
               </button>
             </React.Fragment>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => {
          const isFav = favorites.includes(event.id);
          return (
            <div key={event.id} onClick={() => handleCardClick(event)} className="group relative bg-[#1A1108] rounded-[32px] overflow-hidden shadow-2xl border border-white/5 cursor-pointer hover:-translate-y-1 transition-all">
              <div className="relative h-[280px] w-full overflow-hidden">
                <img src={event.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={event.title} />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-[#1A1108]"></div>
                <div className="absolute top-5 left-5 bg-[#D4AF37]/90 px-2.5 py-1 rounded-lg text-[9px] font-black text-background-dark shadow-lg">OFFICIAL</div>
                <div className="absolute top-5 right-5 bg-black/60 rounded-2xl px-4 py-2 text-center border border-white/10">
                  <p className="text-[8px] font-black text-white/50 uppercase mb-1">{event.date.month}</p>
                  <p className="text-lg font-black text-white">{event.date.day}</p>
                </div>
                <div className="absolute top-[160px] right-5 flex flex-col gap-3 z-20">
                  <button onClick={(e) => toggleFavorite(event.id, e)} className={`w-11 h-11 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/20 ${isFav ? 'bg-[#D4AF37] text-black' : 'bg-black/40 text-white'}`}><span className="material-icons text-xl">{isFav ? 'favorite' : 'favorite_border'}</span></button>
                  <button onClick={(e) => handleShare(event, e)} className="w-11 h-11 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/20 text-white"><span className="material-icons text-xl">share</span></button>
                </div>
              </div>
              <div className="px-7 pb-8 -mt-6 relative z-10">
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic truncate">{event.title}</h3>
                <p className="text-sm font-bold text-white/80 truncate mt-1">{event.park}</p>
                <div className="flex items-center gap-1.5 text-white/60 pt-1">
                  <span className="material-icons text-xs text-[#D4AF37]">place</span>
                  <span className="text-[10px] font-black uppercase tracking-widest truncate">{event.location}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <CircuitPanel isOpen={isCircuitPanelOpen} onClose={() => setIsCircuitPanelOpen(false)} circuits={MOCK_CIRCUITS} selectedId={selectedCircuit} onSelect={setSelectedCircuit} />
    </div>
  );
};

export default EventsView;
