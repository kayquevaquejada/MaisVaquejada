import React, { useState, useEffect } from 'react';
import { EventItem, Circuito, View } from '../types';
import { supabase } from '../lib/supabase';
import AdsCarousel from '../components/AdsCarousel';
import EventModal from '../components/EventModal';
import CircuitPanel from '../components/CircuitPanel';
import GuestCTA from '../components/GuestCTA';
import { VaquejadaCalendar } from '../components/VaquejadaCalendar';
import { CalendarEventsSheet } from '../components/CalendarEventsSheet';
import { PullToRefresh } from '../components/PullToRefresh';

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
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO',
  'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
];

interface EventsViewProps {
  publicEventId?: string;
  onLoginPrompt?: () => void;
  user: any;
}

const EventsView: React.FC<EventsViewProps> = ({ publicEventId, onLoginPrompt, user }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [isReordering, setIsReordering] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [hasOrderChanges, setHasOrderChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const longPressTimer = React.useRef<any>(null);

  const [selectedState, setSelectedState] = useState('');
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
  
  // Calendar States
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(new Date());
  const [eventsOnSelectedDate, setEventsOnSelectedDate] = useState<any[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Layout State
  const [layoutOrder, setLayoutOrder] = useState<string[]>(['banners', 'calendar', 'highlights', 'list']);

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

  const fetchData = async () => {
    setLoading(true);
    const timeoutId = setTimeout(() => {
        if (loading) setLoading(false);
    }, 8000);

    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('is_paused', false)
        .order('display_order', { ascending: true });

      if (eventsError) throw eventsError;

      let mapped: any[] = [];
      if (eventsData) {
          mapped = eventsData.map(ev => ({
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
          mapped = INITIAL_EVENTS;
      }

      // Populate events for selected date (default: today)
      if (selectedCalendarDate) {
        // Função auxiliar temporária para filtrar (seria melhor extrair de VaquejadaCalendar)
        const day = selectedCalendarDate;
        const dayEvents = mapped.filter(ev => {
            if (ev.start_date) {
                const evStart = new Date(ev.start_date + 'T00:00:00');
                const evEnd = ev.end_date ? new Date(ev.end_date + 'T23:59:59') : evStart;
                const checkDate = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                return checkDate >= new Date(evStart.getFullYear(), evStart.getMonth(), evStart.getDate()) && 
                       checkDate <= new Date(evEnd.getFullYear(), evEnd.getMonth(), evEnd.getDate());
            }
            return false;
        });
        setEventsOnSelectedDate(dayEvents);
      }

      // Fetch Layout Order
      const { data: settingsData } = await supabase.from('app_settings').select('value').eq('key', 'events_layout_order').maybeSingle();
      if (settingsData && settingsData.value && Array.isArray(settingsData.value)) {
          setLayoutOrder(settingsData.value);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setEvents(INITIAL_EVENTS);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleFavorite = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    // Verificar se o usuário está logado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.dispatchEvent(new CustomEvent('arena_show_login'));
        return;
    }

    setFavorites(prev => prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]);
    try {
        if (!favorites.includes(id)) {
            await supabase.from('event_likes').insert({ event_id: id, user_id: user.id });
            setLikesCount(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
        } else {
            await supabase.from('event_likes').delete().eq('event_id', id).eq('user_id', user.id);
            setLikesCount(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) - 1) }));
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
    const matchesState = !selectedState || new RegExp(`\\b${selectedState}\\b`).test(location);
    const matchesSearch = searchQuery === '' || location.toLowerCase().includes(searchQuery.toLowerCase()) || title.includes(searchQuery.toLowerCase());
    const matchesCircuit = selectedCircuit === 'todos' || e.circuitoId === selectedCircuit;
    return matchesState && matchesSearch && matchesCircuit;
  });

  const handleCardClick = (event: EventItem) => {
    if (isReordering) return;
    window.dispatchEvent(new CustomEvent('arena_navigate', { 
      detail: { view: View.EVENT_DETAILS, event: event } 
    }));
  };

  const handleDragStart = (id: string) => {
    if (!user?.isMaster) return;
    setDraggedId(id);
    setIsReordering(true);
  };

  const handleDragOver = (e: React.DragEvent | React.TouchEvent, targetId: string) => {
    if ('preventDefault' in e) e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const draggedIdx = events.findIndex(ev => ev.id === draggedId);
    const targetIdx = events.findIndex(ev => ev.id === targetId);
    
    if (draggedIdx === -1 || targetIdx === -1) return;

    const newEvents = [...events];
    const [removed] = newEvents.splice(draggedIdx, 1);
    newEvents.splice(targetIdx, 0, removed);
    
    setEvents(newEvents);
    setHasOrderChanges(true);
  };

  const handleTouchStart = (id: string) => {
    if (!user?.isMaster) return;
    longPressTimer.current = setTimeout(() => {
        setDraggedId(id);
        setIsReordering(true);
        if (navigator.vibrate) navigator.vibrate(50);
    }, 600);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isReordering) {
        clearTimeout(longPressTimer.current);
        return;
    }
    
    e.preventDefault();
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const card = target?.closest('[data-event-id]');
    if (card) {
        const targetId = card.getAttribute('data-event-id');
        if (targetId && targetId !== draggedId) {
            handleDragOver(e, targetId);
        }
    }
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current);
    // Don't reset isReordering here so they can see the "Save" button
  };

  const saveNewOrder = async () => {
    try {
      const updates = events.map((ev, index) => ({
        id: ev.id,
        display_order: index
      }));

      for (const update of updates) {
        await supabase.from('events').update({ display_order: update.display_order }).eq('id', update.id);
      }
      
      setHasOrderChanges(false);
      setIsReordering(false);
      setDraggedId(null);
      alert('Ordem salva com sucesso!');
    } catch (err) {
      alert('Erro ao salvar nova ordem');
    }
  };

  return (
    <PullToRefresh onRefresh={fetchData} className="bg-background-dark">
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

        {user?.isMaster && hasOrderChanges && (
          <div className="mb-4 animate-in fade-in slide-in-from-top-4">
            <button 
              onClick={saveNewOrder}
              className="w-full bg-[#ECA413] text-black font-black uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-[#ECA413]/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <span className="material-icons">save</span>
              Salvar Nova Ordem dos Eventos
            </button>
          </div>
        )}

        <GuestCTA user={user} />

        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 pt-4">
          {STATES.map((uf, idx) => (
             <React.Fragment key={uf}>
               <button 
                 onClick={() => setSelectedState(selectedState === uf ? '' : uf)} 
                 className={`px-6 py-2.5 rounded-full font-black text-[11px] uppercase tracking-widest whitespace-nowrap transition-all border ${selectedState === uf ? 'bg-[#D4AF37] border-[#D4AF37] text-background-dark' : 'bg-white/5 border-white/10 text-white/40'}`}
               >
                 {uf}
               </button>
             </React.Fragment>
          ))}
        </div>
      </header>

      {/* Renderização Dinâmica Baseada no LayoutOrder */}
      <div className="space-y-10">
        {layoutOrder.map(blockId => {
          if (blockId === 'banners') {
            return (
              <div key="banners" className="-mx-6 border-b border-white/5 pb-4 mb-2">
                <AdsCarousel key="vaquejada_top_ads" targetPosition="vaquejada_top_carousel" />
              </div>
            );
          }

          if (blockId === 'calendar') {
            return (
              <div key="calendar" className="relative z-10 space-y-6">
                <VaquejadaCalendar 
                  events={events} 
                  selectedDate={selectedCalendarDate}
                  onSelectDate={(date, evs) => {
                    setSelectedCalendarDate(date);
                    setEventsOnSelectedDate(evs);
                    // Não abrimos mais o sheet automaticamente se houver agenda na tela
                    // Mas podemos deixar aberto se o usuário preferir. 
                    // Por agora, vamos garantir que a agenda abaixo atualize.
                  }}
                />

                {/* AGENDA DO DIA SELECIONADO */}
                <div className="bg-white/5 rounded-[32px] p-6 border border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="material-icons text-[#D4AF37]">event_note</span>
                      <h2 className="text-lg font-black text-white uppercase tracking-tighter italic">
                        {selectedCalendarDate?.toDateString() === new Date().toDateString() ? 'Agenda de Hoje' : 'Programação do Dia'}
                      </h2>
                    </div>
                    {selectedCalendarDate && (
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                        {selectedCalendarDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}
                      </span>
                    )}
                  </div>

                  {eventsOnSelectedDate.length > 0 ? (
                    <div className="space-y-3">
                      {eventsOnSelectedDate.map(ev => (
                        <div 
                          key={`agenda-${ev.id}`}
                          onClick={() => handleCardClick(ev)}
                          className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5 active:scale-[0.98] transition-transform"
                        >
                          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                            <img src={ev.imageUrl || ev.image_url} className="w-full h-full object-cover" alt="" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-black text-sm uppercase truncate">{ev.title}</h4>
                            <p className="text-white/40 text-[10px] font-bold truncate">{ev.park} • {ev.location}</p>
                          </div>
                          <span className="material-icons text-[#D4AF37] text-sm">chevron_right</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center border border-dashed border-white/10 rounded-2xl">
                      <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">Nenhum evento para esta data</p>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          if (blockId === 'highlights') {
             // Futuramente, destaques oficiais
             return null;
          }

          if (blockId === 'list') {
            return (
              <div key="list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-0">
                {filteredEvents.map((event) => {
                  const isFav = favorites.includes(event.id);
                  const isDragging = draggedId === event.id;
                  
                  return (
                    <div 
                      key={event.id} 
                      data-event-id={event.id}
                      onClick={() => handleCardClick(event)} 
                      draggable={user?.isMaster}
                      onDragStart={() => handleDragStart(event.id)}
                      onDragOver={(e) => handleDragOver(e, event.id)}
                      onDragEnd={() => setDraggedId(null)}
                      onTouchStart={() => handleTouchStart(event.id)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      className={`group relative bg-[#1A1108] rounded-[32px] overflow-hidden shadow-2xl border transition-all duration-300 ${isDragging ? 'opacity-40 scale-95 border-[#ECA413] z-50' : 'border-white/5 hover:-translate-y-1'}`}
                    >
                      {user?.isMaster && (
                        <div className={`absolute top-5 left-5 z-30 w-8 h-8 rounded-full flex items-center justify-center border shadow-lg transition-all ${isReordering ? 'bg-[#ECA413] border-[#ECA413] text-black animate-pulse' : 'bg-black/60 backdrop-blur-md border-white/20 text-white/50'}`}>
                          <span className="material-icons text-sm">{isReordering ? 'touch_app' : 'reorder'}</span>
                        </div>
                      )}
                      
                      <div className="relative h-[280px] w-full overflow-hidden">
                        <img src={event.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={event.title} />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-[#1A1108]"></div>
                        {event.is_highlight && (
                          <div className={`absolute top-5 ${user?.isMaster ? 'left-16' : 'left-5'} bg-[#D4AF37]/90 px-2.5 py-1 rounded-lg text-[9px] font-black text-background-dark shadow-lg transition-all`}>
                            OFFICIAL
                          </div>
                        )}
                        <div className="absolute top-5 right-5 bg-black/60 rounded-2xl px-4 py-2 text-center border border-white/10">
                          <p className="text-[8px] font-black text-white/50 uppercase mb-1">{event.date.month || event.date_month}</p>
                          <p className="text-lg font-black text-white">{event.date.day || event.date_day}</p>
                        </div>
                        <div className="absolute top-[160px] right-5 flex flex-col gap-3 z-20">
                          <div className="flex flex-col items-center gap-0.5">
                            <button onClick={(e) => toggleFavorite(event.id, e)} className={`w-11 h-11 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/20 ${isFav ? 'bg-[#D4AF37] text-black' : 'bg-black/40 text-white'}`}><span className="material-icons text-xl">{isFav ? 'favorite' : 'favorite_border'}</span></button>
                            {(likesCount[event.id] || 0) > 0 && (
                              <span className="text-[10px] font-black text-white drop-shadow-lg">{likesCount[event.id]}</span>
                            )}
                          </div>
                          <button onClick={(e) => handleShare(event, e)} className="w-11 h-11 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/20 text-white"><span className="material-icons text-xl">share</span></button>
                        </div>
                      </div>
                      <div className="px-7 pb-8 -mt-6 relative z-10">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter italic truncate">{event.title}</h3>
                        <p className="text-sm font-bold text-white/80 truncate mt-1">{event.park}</p>
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1.5 text-white/60">
                            <span className="material-icons text-xs text-[#D4AF37]">place</span>
                            <span className="text-[10px] font-black uppercase tracking-widest truncate">{event.location}</span>
                          </div>
                          <div className="flex items-center gap-1 text-white/50">
                            <span className="material-icons text-sm text-[#D4AF37]">favorite</span>
                            <span className="text-[10px] font-black">{likesCount[event.id] || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }

          return null;
        })}
      </div>

      <CircuitPanel isOpen={isCircuitPanelOpen} onClose={() => setIsCircuitPanelOpen(false)} circuits={MOCK_CIRCUITS} selectedId={selectedCircuit} onSelect={setSelectedCircuit} />
      
      {isSheetOpen && selectedCalendarDate && (
        <CalendarEventsSheet 
          date={selectedCalendarDate} 
          events={eventsOnSelectedDate} 
          onClose={() => setIsSheetOpen(false)} 
          onEventClick={handleCardClick} 
        />
      )}
      </div>
    </PullToRefresh>
  );
};

export default EventsView;
