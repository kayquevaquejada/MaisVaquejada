import React from 'react';
import { EventItem } from '../types';

interface EventModalProps {
  event: EventItem | null;
  onClose: () => void;
  onZoom: (imageUrl: string) => void;
}

const EventModal: React.FC<EventModalProps> = ({ event, onClose, onZoom }) => {
  if (!event) return null;

  return (
    <div className="fixed inset-0 z-[500] flex justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[480px] h-full bg-[#0F0A05] relative overflow-y-auto hide-scrollbar shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
        <div className="relative w-full aspect-[4/5] bg-neutral-900">
          <img src={event.imageUrl} className="w-full h-full object-cover" alt={event.title}/>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F0A05] via-transparent to-black/40"></div>
          <button onClick={onClose} className="absolute top-6 left-6 w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all shadow-2xl">
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="px-8 -mt-20 relative z-10 pb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#ECA413] rounded-full mb-4 shadow-lg shadow-[#ECA413]/20">
            <span className="material-icons text-[12px] text-black">stars</span>
            <span className="text-[9px] font-black uppercase tracking-tighter text-black">{event.category || 'Vaquejada'}</span>
          </div>
          <h2 className="text-3xl font-black text-white leading-none mb-3 italic tracking-tighter uppercase">{event.title}</h2>
          <div className="flex items-center gap-3 mb-8 opacity-60">
            <div className="flex items-center gap-1"><span className="material-icons text-sm text-[#ECA413]">place</span><span className="text-[11px] font-bold uppercase tracking-widest">{event.location}</span></div>
            <div className="w-1 h-1 rounded-full bg-white/20"></div>
            <div className="flex items-center gap-1"><span className="material-icons text-sm text-[#ECA413]">business</span><span className="text-[11px] font-bold uppercase tracking-widest">{event.park}</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-10">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#ECA413] mb-1">Premiação</p>
              <p className="text-sm font-bold text-white leading-tight">{event.prizes || 'A definir'}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#ECA413] mb-1">Inscrição</p>
              <p className="text-sm font-bold text-white leading-tight">{event.price || 'Paga'}</p>
            </div>
          </div>

          <div className="mb-10">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-4 ml-1">Sobre o Evento</h3>
            <div className="bg-white/5 border border-white/10 rounded-[28px] p-6 text-white/80 text-[13px] leading-relaxed font-medium">
              {event.description || 'Nenhuma descrição detalhada fornecida para este evento.'}
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={onClose} className="flex-1 bg-white/10 text-white font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-[10px] border border-white/5 active:scale-95 transition-all">Voltar</button>
            <button onClick={() => onZoom(event.imageUrl)} className="flex-1 bg-[#ECA413] text-black font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-[10px] active:scale-95 transition-all shadow-lg shadow-[#ECA413]/20">Ampliar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventModal;
