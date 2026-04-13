import React from 'react';
import { EventItem } from '../types';

interface EventDetailViewProps {
  event: EventItem | null;
  onBack: () => void;
}

const EventDetailView: React.FC<EventDetailViewProps> = ({ event, onBack }) => {
  const [fullscreenImage, setFullscreenImage] = React.useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = React.useState(0);

  // DEBUG LOGS as requested
  console.log("EVENTO RECEBIDO NA TELA DE DETALHES:", event);

  // 4) VALIDAÇÃO FORTE ANTES DE RENDERIZAR
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

  // 10) BLINDAR A TELA CONTRA CRASH - Extrair variáveis seguras
  const title = event?.title || "Evento sem Título";
  const park = event?.park || "Parque não informado";
  const location = event?.location || "Local não informado";
  const prizes = event?.prizes || "Premiação a definir";
  const price = event?.price || "Consultar valor";
  const description = event?.description || "Nenhuma descrição detalhada disponível.";
  
  // Imagens (Garante que sempre haja pelo menos a principal)
  const images = (event.images && event.images.length > 0) ? event.images : [event.imageUrl];
  
  const month = event?.date?.month || "---";
  const day = event?.date?.day || "--";
  const category = event?.category || "Vaquejada";

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
          {images.map((img, idx) => (
            <div 
              key={idx} 
              className="w-full h-full shrink-0 snap-center relative"
              onClick={() => setFullscreenImage(img)}
            >
              <img src={img} className="w-full h-full object-cover" alt={`${title} - ${idx + 1}`}/>
              <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-black/40"></div>
            </div>
          ))}
        </div>

        {/* Indicadores de Página (se houver + de 1 foto) */}
        {images.length > 1 && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md">
            {images.map((_, idx) => (
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
              <span className="material-icons">share</span>
            </button>
          </div>
        </div>

        {/* Lente de Zoom Icon */}
        <div className="absolute bottom-28 right-8 z-20 pointer-events-none opacity-60">
           <div className="bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2">
              <span className="material-icons text-white text-xs">zoom_in</span>
              <span className="text-[8px] font-black text-white uppercase tracking-widest">Toque para ampliar</span>
           </div>
        </div>
      </div>

      <div className="px-8 -mt-24 relative z-10">
        {/* Content Card Header */}
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

        {/* Info Sections */}
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 mb-4 ml-2">Informações Adicionais</h3>
            <div className="bg-white/5 border border-white/10 rounded-[32px] p-8">
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

        {/* CTA Button */}
        <div className="fixed bottom-10 left-8 right-8 z-[100]">
          <button className="w-full bg-[#ECA413] hover:bg-[#FFB82B] text-black h-16 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-[0_10px_30px_rgba(236,164,19,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-3">
            Falar com Organizador
            <span className="material-icons">whatsapp</span>
          </button>
        </div>
      </div>

      {/* Fullscreen Zoom Modal */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-300"
          onClick={() => setFullscreenImage(null)}
        >
          <button className="absolute top-10 right-10 text-white w-12 h-12 bg-white/10 rounded-full flex items-center justify-center active:scale-90 transition-transform">
            <span className="material-icons text-3xl">close</span>
          </button>
          
          <div className="w-full h-full flex items-center justify-center p-4">
            <img 
              src={fullscreenImage} 
              className="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-300" 
              alt="Zoomed"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
          
          <div className="absolute bottom-10 text-center pointer-events-none">
             <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em]">Pince para dar zoom • Toque fora para fechar</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default EventDetailView;
