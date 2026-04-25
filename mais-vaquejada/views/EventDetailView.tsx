import React, { useState, useEffect, useMemo } from 'react';
import { EventItem, User } from '../types';
import { supabase } from '../lib/supabase';

interface EventDetailViewProps {
  event: EventItem | null;
  user: User | null;
  onBack: () => void;
}

const EventDetailView: React.FC<EventDetailViewProps> = ({ event, user, onBack }) => {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [presenceCount, setPresenceCount] = useState(0);
  const [isGoing, setIsGoing] = useState(false);
  const [loadingPresence, setLoadingPresence] = useState(false);
  const [organizer, setOrganizer] = useState<any>(null);
  const [hasResultId, setHasResultId] = useState<string | null>(null);

  // Status map
  const statusConfig = {
    em_breve: { label: 'Em Breve', color: 'bg-blue-500', icon: 'schedule' },
    confirmado: { label: 'Confirmado', color: 'bg-green-500', icon: 'verified' },
    acontecendo: { label: 'Acontecendo', color: 'bg-red-500', icon: 'sensors' },
    encerrado: { label: 'Encerrado', color: 'bg-gray-500', icon: 'done_all' }
  };

  const currentStatus = event?.status || 'confirmado';
  const status = statusConfig[currentStatus as keyof typeof statusConfig] || statusConfig.confirmado;

  useEffect(() => {
    if (event?.id) {
      fetchPresence();
      checkResult();
      if (event.organizador_id) fetchOrganizer();
    }
  }, [event?.id]);

  const checkResult = async () => {
    if (!event?.id) return;
    const { data } = await supabase
      .from('resultados')
      .select('id')
      .eq('evento_id', event.id)
      .eq('status', 'publicado')
      .maybeSingle();
    if (data) setHasResultId(data.id);
  };

  const fetchPresence = async () => {
    if (!event?.id) return;
    
    // Total count
    const { count } = await supabase
      .from('event_presences')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event.id);
    
    setPresenceCount(count || 0);

    // My status
    if (user?.id) {
      const { data } = await supabase
        .from('event_presences')
        .select('*')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .single();
      setIsGoing(!!data);
    }
  };

  const fetchOrganizer = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', event?.organizador_id)
      .single();
    if (data) setOrganizer(data);
  };

  const togglePresence = async () => {
    if (!user || !event?.id) {
      alert('Faça login para confirmar sua presença!');
      return;
    }

    setLoadingPresence(true);
    try {
      if (isGoing) {
        await supabase
          .from('event_presences')
          .delete()
          .eq('event_id', event.id)
          .eq('user_id', user.id);
        setIsGoing(false);
        setPresenceCount(prev => prev - 1);
      } else {
        await supabase
          .from('event_presences')
          .insert({ event_id: event.id, user_id: user.id });
        setIsGoing(true);
        setPresenceCount(prev => prev + 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPresence(false);
    }
  };

  const openNavigation = () => {
    if (event?.latitude && event?.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`;
      window.open(url, '_blank');
    } else if (event?.endereco) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.endereco)}`;
      window.open(url, '_blank');
    } else {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event?.park} ${event?.location}`)}`;
      window.open(url, '_blank');
    }
  };

  if (!event) return null;

  const allImages = useMemo(() => {
    const list: string[] = [];
    if (event.imageUrl) list.push(event.imageUrl);
    if (Array.isArray(event.galeria_urls)) list.push(...event.galeria_urls);
    return Array.from(new Set(list)).filter(Boolean);
  }, [event]);

  return (
    <div className="min-h-screen bg-[#0F0A05] pb-40 animate-in fade-in duration-300 overflow-x-hidden">
      
      {/* Header Imagem / Carrossel */}
      <div className="relative w-full aspect-[4/5] sm:aspect-video bg-neutral-900">
        <div 
          className="flex w-full h-full overflow-x-auto snap-x snap-mandatory hide-scrollbar"
          onScroll={(e: any) => {
            const idx = Math.round(e.target.scrollLeft / e.target.offsetWidth);
            setCurrentIdx(idx);
          }}
        >
          {allImages.map((img, idx) => (
            <div key={idx} className="w-full h-full shrink-0 snap-center relative" onClick={() => setFullscreenImage(img)}>
              <img src={img} className="w-full h-full object-cover" alt="Banner" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F0A05] via-transparent to-black/60" />
            </div>
          ))}
        </div>

        {/* Back Button */}
        <button onClick={onBack} className="absolute top-6 left-6 w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white z-30 active:scale-90 transition-all">
          <span className="material-icons">arrow_back</span>
        </button>

        {/* Indicadores */}
        {allImages.length > 1 && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-md">
            {allImages.map((_, idx) => (
              <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === currentIdx ? 'bg-[#ECA413] w-4' : 'bg-white/40'}`} />
            ))}
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-6 right-6 z-30">
          <div className={`${status.color} px-4 py-2 rounded-full flex items-center gap-2 shadow-lg shadow-black/40`}>
            <span className="material-icons text-sm text-white">{status.icon}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-white">{status.label}</span>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="px-6 -mt-32 relative z-10">
        
        {/* Card de Título e Organização */}
        <div className="bg-[#1A1108]/95 backdrop-blur-2xl border border-white/10 rounded-[40px] p-8 shadow-2xl mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-icons text-[#ECA413] text-sm">stars</span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ECA413]">{event.category}</span>
          </div>
          
          <h1 className="text-4xl font-black text-white italic leading-[1.1] mb-6 tracking-tighter uppercase">{event.title}</h1>
          
          {/* Botão de Resultado se disponível */}
          {hasResultId && (
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('arena_navigate', { 
                detail: { view: View.RESULT_DETAIL, resultId: hasResultId } 
              }))}
              className="w-full mb-8 bg-[#1A1108] border-2 border-[#D4AF37] rounded-[24px] p-5 flex items-center justify-between group active:scale-95 transition-all shadow-xl shadow-[#D4AF37]/10"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#D4AF37] rounded-xl flex items-center justify-center shadow-lg">
                  <span className="material-icons text-white">emoji_events</span>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase text-[#D4AF37] tracking-[0.2em] leading-none mb-1">Status Final</p>
                  <p className="text-lg font-black text-white uppercase italic leading-none">Ver Resultado Oficial</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#D4AF37]/20 transition-colors">
                <span className="material-icons text-[#D4AF37]">chevron_right</span>
              </div>
            </button>
          )}

          {/* Info Básica */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-col justify-center">
              <p className="text-[8px] font-black uppercase text-[#ECA413] tracking-widest mb-1">📅 Data do Evento</p>
              <p className="text-lg font-black text-white">{event.date.day} de {event.date.month}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-col justify-center">
              <p className="text-[8px] font-black uppercase text-[#ECA413] tracking-widest mb-1">🏆 Premiação</p>
              <p className="text-lg font-black text-white">{event.prizes || 'A definir'}</p>
            </div>
          </div>

          {/* Organizador */}
          <div className="mt-8 flex items-center justify-between p-4 bg-white/5 rounded-3xl border border-white/10 active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-neutral-800 border border-white/10 overflow-hidden">
                <img src={organizer?.avatar_url || 'https://ui-avatars.com/api/?name=' + event.park} className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-[8px] font-black uppercase text-white/40 tracking-widest">Organização</p>
                <p className="text-sm font-black text-white">{event.park}</p>
              </div>
            </div>
            <span className="material-icons text-white/20">chevron_right</span>
          </div>
        </div>

        {/* Geolocalização e Mapa */}
        <div className="space-y-4 mb-8">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 ml-4">Localização</h3>
          <div className="bg-white/5 border border-white/10 rounded-[40px] overflow-hidden">
            {/* Mini Mapa (Simulado) */}
            <div 
              onClick={openNavigation}
              className="h-40 w-full bg-neutral-800 relative cursor-pointer group"
            >
              <img 
                src={`https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80`} 
                className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700" 
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-[#ECA413] rounded-full flex items-center justify-center shadow-2xl animate-bounce">
                  <span className="material-icons text-black">place</span>
                </div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center justify-between">
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Toque para ver no mapa</span>
                <span className="material-icons text-white text-sm">open_in_new</span>
              </div>
            </div>
            
            <div className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 bg-[#ECA413]/10 rounded-xl flex items-center justify-center border border-[#ECA413]/20">
                  <span className="material-icons text-[#ECA413]">location_on</span>
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold text-sm leading-tight mb-1">{event.endereco || event.park}</p>
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">{event.location}</p>
                </div>
              </div>
              
              <button 
                onClick={openNavigation}
                className="w-full h-14 bg-white text-black rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl"
              >
                <span className="material-icons text-lg">directions</span>
                Como Chegar
              </button>
            </div>
          </div>
        </div>

        {/* Presença e Social */}
        <div className="bg-gradient-to-br from-[#ECA413] to-[#B87D0B] rounded-[40px] p-8 shadow-2xl mb-8 relative overflow-hidden group">
          {/* Grafismo de fundo */}
          <span className="material-icons absolute -bottom-4 -right-4 text-9xl text-black/10 rotate-12 group-hover:scale-110 transition-transform duration-700">groups</span>
          
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <h4 className="text-black font-black text-2xl uppercase italic tracking-tighter leading-none mb-1">PRESENÇA CONFIRMADA</h4>
              <p className="text-black/60 text-xs font-bold uppercase tracking-widest">
                {presenceCount} {presenceCount === 1 ? 'pessoa confirmada' : 'pessoas confirmadas'}
              </p>
            </div>
            
            <button 
              onClick={togglePresence}
              disabled={loadingPresence}
              className={`px-8 h-16 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center gap-2 shadow-2xl active:scale-95 transition-all ${isGoing ? 'bg-black text-white' : 'bg-white text-black'}`}
            >
              <span className="material-icons text-lg">{isGoing ? 'check_circle' : 'person_add'}</span>
              {isGoing ? 'Vou estar lá!' : 'Eu vou!'}
            </button>
          </div>
        </div>

        {/* Programação e Horários */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 ml-4 mb-4">Ingressos e Valores</h3>
            <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Inscrição</span>
                <span className="text-white font-black">{event.valor_inscricao || event.price}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Entrada/Ingresso</span>
                <span className="text-[#ECA413] font-black">{event.valor_ingresso || 'Grátis'}</span>
              </div>
              <button className="w-full h-14 bg-white/10 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-all">
                <span className="material-icons text-sm">confirmation_number</span>
                Comprar antecipado
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 ml-4 mb-4">Programação</h3>
            <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <span className="material-icons text-white/40">schedule</span>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-white/40 tracking-widest mb-0.5">Início Previsto</p>
                  <p className="text-sm font-black text-white">{event.horario_inicio || '08:00'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <span className="material-icons text-white/40">last_page</span>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-white/40 tracking-widest mb-0.5">Encerramento</p>
                  <p className="text-sm font-black text-white">{event.horario_fim || '22:00'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Descrição e Contato */}
        <div className="space-y-8">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 ml-4 mb-4">Detalhes do Evento</h3>
            <div className="bg-white/5 border border-white/10 rounded-[40px] p-8">
              <p className="text-white/70 text-sm leading-relaxed font-medium whitespace-pre-wrap mb-8">
                {event.description}
              </p>
              
              <div className="pt-8 border-t border-white/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#ECA413] mb-6">Falar com a Organização</p>
                <div className="grid grid-cols-2 gap-3">
                  <a 
                    href={`https://wa.me/${event.whatsapp?.replace(/\D/g, '') || event.phone?.replace(/\D/g, '')}`} 
                    target="_blank"
                    className="h-14 bg-[#25D366]/10 text-[#25D366] rounded-2xl border border-[#25D366]/20 flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
                  >
                    <span className="material-icons text-sm">chat</span> WhatsApp
                  </a>
                  <a 
                    href={`https://instagram.com/${event.instagram?.replace('@', '')}`} 
                    target="_blank"
                    className="h-14 bg-[#E1306C]/10 text-[#E1306C] rounded-2xl border border-[#E1306C]/20 flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
                  >
                    <span className="material-icons text-sm">photo_camera</span> Instagram
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Image Overlay */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-300"
          onClick={() => setFullscreenImage(null)}
        >
          <button className="absolute top-10 right-10 text-white w-12 h-12 bg-white/10 rounded-full flex items-center justify-center z-50">
            <span className="material-icons text-3xl">close</span>
          </button>
          <img src={fullscreenImage} className="max-w-full max-h-[80vh] object-contain shadow-2xl animate-in zoom-in-95 duration-300" />
        </div>
      )}
    </div>
  );
};

export default EventDetailView;
