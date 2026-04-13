import React, { useState, useMemo } from 'react';
import { EventItem } from '../types';

interface EventDetailViewProps {
  event: EventItem | null;
  onBack: () => void;
}

const EventDetailView: React.FC<EventDetailViewProps> = ({ event, onBack }) => {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const [touchStartDist, setTouchStartDist] = useState(0);

  // DEBUG LOGS
  console.log("EVENTO RECEBIDO NA TELA DE DETALHES:", event);

  if (!event || typeof event !== 'object') {
    return (
      <div className="min-h-screen bg-[#0F0A05] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
          <span className="material-icons text-white/20 text-4xl">error_outline</span>
        </div>
        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Erro ao carregar evento</h2>
        <p className="text-white/40 text-sm max-w-xs mb-8">Os dados deste evento não estão disponíveis no momento.</p>
        <button 
          onClick={onBack}
          className="px-8 py-4 bg-[#ECA413] text-black font-black uppercase text-xs tracking-widest rounded-2xl active:scale-95 transition-all shadow-lg shadow-[#ECA413]/20"
        >
          Voltar para Início
        </button>
      </div>
    );
  }

  const title = event?.title || "Evento sem Título";
  const park = event?.park || "Parque não informado";
  const location = event?.location || "Local não informado";
  const prizes = event?.prizes || "Premiação a definir";
  const price = event?.price || "Consultar valor";
  const description = event?.description || "Nenhuma descrição detalhada disponível.";
  
  // Imagens suportando tanto 'images' quanto 'gallery' do admin
  const allImages = useMemo(() => {
    const list: string[] = [];
    if (event.imageUrl) list.push(event.imageUrl);
    if (Array.isArray(event.images)) list.push(...event.images);
    if (Array.isArray((event as any).gallery)) list.push(...(event as any).gallery);
    return Array.from(new Set(list)).filter(Boolean);
  }, [event]);

  const month = event?.date?.month || "---";
  const day = event?.date?.day || "--";
  const category = event?.category || "Vaquejada";

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      setTouchStartDist(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDist > 0) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const ratio = dist / touchStartDist;
      setZoomScale(prev => Math.min(Math.max(1, prev * ratio), 4));
      setTouchStartDist(dist);
    }
  };

  return (
    <div className="min-h-screen bg-background-dark pb-32 animate-in fade-in duration-300">
      
      {/* Imagem/Carrossel Principal */}
      <div className="relative w-full aspect-[4/5] bg-neutral-900 overflow-hidden">
        <div 
          className="flex w-full h-full overflow-x-auto snap-x snap-mandatory hide-scrollbar"
          onScroll={(e: any) => {
            const idx = Math.round(e.target.scrollLeft / e.target.offsetWidth);
            setCurrentIdx(idx);
          }}
        >
          {allImages.map((img, idx) => (
            <div 
              key={idx} 
              className="w-full h-full shrink-0 snap-center relative"
              onClick={() => {
                setFullscreenImage(img);
                setZoomScale(1);
              }}
            >
              <img src={img} className="w-full h-full object-cover" alt={`${title} - ${idx + 1}`}/>
              <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-black/40"></div>
            </div>
          ))}
        </div>

        {/* Indicadores de Página */}
        {allImages.length > 1 && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md">
            {allImages.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === currentIdx ? 'bg-[#ECA413] w-4' : 'bg-white/40'}`}
              />
            ))}
          </div>
        )}
        
        {/* Top Actions */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-30">
          <button 
            onClick={onBack} 
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all shadow-2xl"
          >
            <span className="material-icons">arrow_back</span>
          </button>
          
          <div className="flex gap-2">
            <button className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all shadow-2xl">
              <span className="material-icons">share_content</span>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-28 right-8 z-20 pointer-events-none opacity-60">
           <div className="bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2">
              <span className="material-icons text-white text-xs">zoom_in</span>
              <span className="text-[8px] font-black text-white uppercase tracking-widest">Toque para ampliar</span>
           </div>
        </div>
      </div>

      <div className="px-8 -mt-24 relative z-10">
        <div className="bg-[#1A1108]/90 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 shadow-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#ECA413] rounded-full mb-4 shadow-lg shadow-[#ECA413]/20">
            <span className="material-icons text-[12px] text-black">stars</span>
            <span className="text-[9px] font-black uppercase tracking-tighter text-black">{category}</span>
          </div>

          <h1 className="text-4xl font-black text-white leading-none mb-3 italic tracking-tighter uppercase">{title}</h1>
          
          <div className="flex flex-wrap items-center gap-4 opacity-70 mb-6">
            <div className="flex items-center gap-1.5">
              <span className="material-icons text-sm text-[#ECA413]">place</span>
              <span className="text-xs font-bold uppercase tracking-widest">{location}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-icons text-sm text-[#ECA413]">business</span>
              <span className="text-xs font-bold uppercase tracking-widest">{park}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ECA413] mb-1">Premiação</p>
              <p className="text-sm font-black text-white leading-tight">{prizes}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ECA413] mb-1">Data</p>
              <p className="text-sm font-black text-white leading-tight">{day} de {month}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 mb-4 ml-2">Informações Adicionais</h3>
            <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 text-white">
              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Inscrição</span>
                <span className="text-white font-black text-sm">{price}</span>
              </div>
              <div className="flex items-center justify-between py-4">
                <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Status</span>
                <span className="text-[#ECA413] font-black text-xs uppercase tracking-widest flex items-center gap-1">
                  <span className="material-icons text-sm">verified</span> Confirmado
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 mb-4 ml-2">Descrição Completa</h3>
            <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 text-white/70 text-sm leading-relaxed font-medium whitespace-pre-wrap">
              {description}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Zoom Modal */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-300 overflow-hidden"
          onClick={() => {
            setFullscreenImage(null);
            setZoomScale(1);
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          <button className="absolute top-10 right-10 text-white w-12 h-12 bg-white/10 rounded-full flex items-center justify-center active:scale-90 transition-transform z-50">
            <span className="material-icons text-3xl">close</span>
          </button>
          
          <div 
            className="w-full h-full flex items-center justify-center p-4 transition-transform duration-200 ease-out"
            style={{ 
              transform: `scale(${zoomScale})`,
              touchAction: zoomScale > 1 ? 'none' : 'auto'
            }}
          >
            <img 
              src={fullscreenImage} 
              className="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-300" 
              alt="Zoomed"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
          
          <div className="absolute bottom-10 text-center pointer-events-none z-50">
             <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em]">Pince para dar zoom ({zoomScale.toFixed(1)}x) • Toque fora para fechar</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetailView;
