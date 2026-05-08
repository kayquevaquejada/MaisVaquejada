import React from 'react';
import { EventItem } from '../types';

interface CalendarEventsSheetProps {
  date: Date;
  events: EventItem[];
  onClose: () => void;
  onEventClick: (event: EventItem) => void;
}

export const CalendarEventsSheet: React.FC<CalendarEventsSheetProps> = ({ date, events, onClose, onEventClick }) => {
  const formattedDate = date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  return (
    <div className="fixed inset-0 z-[999] flex flex-col justify-end pointer-events-auto">
      {/* OVERLAY */}
      <div 
        className="absolute inset-0 bg-[#0F0A05]/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* SHEET */}
      <div className="relative bg-[#1A1108] w-full max-h-[80vh] rounded-t-3xl border-t border-[#D4AF37]/30 shadow-[0_-10px_40px_rgba(212,175,55,0.1)] flex flex-col animate-in slide-in-from-bottom-full duration-300">
        
        {/* DRAG INDICATOR */}
        <div className="w-full flex justify-center pt-3 pb-2" onClick={onClose}>
          <div className="w-12 h-1.5 bg-white/20 rounded-full"></div>
        </div>

        {/* HEADER */}
        <div className="px-6 pb-4 border-b border-white/5">
          <h3 className="text-[#D4AF37] font-black text-lg uppercase tracking-wide capitalize">{formattedDate}</h3>
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest">{events.length} {events.length === 1 ? 'Evento' : 'Eventos'}</p>
        </div>

        {/* CONTENT LIST */}
        <div className="overflow-y-auto p-4 space-y-3 pb-10">
          {events.map(ev => (
            <div 
              key={ev.id} 
              onClick={() => onEventClick(ev)}
              className="bg-[#0F0A05] border border-white/5 rounded-2xl p-3 flex gap-4 items-center active:scale-95 transition-transform cursor-pointer relative overflow-hidden group hover:border-[#D4AF37]/30"
            >
              {/* STATUS INDICATOR (Luz de atividade) */}
              {(ev.is_highlight || ev.isHighlight) && (
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#D4AF37] to-[#AA8A2E]"></div>
              )}

              {/* THUMBNAIL */}
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#1A1108] shrink-0 border border-white/10 relative">
                <img src={ev.image_url || ev.imageUrl || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt={ev.title} />
              </div>

              {/* DETAILS */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-white font-black uppercase text-sm truncate">{ev.title}</h4>
                  {(ev.is_highlight || ev.isHighlight) && (
                    <span className="material-icons text-[12px] text-[#D4AF37]">stars</span>
                  )}
                </div>
                
                <div className="flex items-center gap-1 text-[#D4AF37]/80 mb-1">
                  <span className="material-icons text-[10px]">place</span>
                  <p className="text-[10px] font-bold uppercase truncate">{ev.location} - {ev.park}</p>
                </div>

                <div className="flex items-center gap-1 text-white/40">
                  <span className="material-icons text-[10px]">event</span>
                  <p className="text-[9px] font-black uppercase tracking-widest">{ev.date_day || ev.date?.day} {ev.date_month || ev.date?.month}</p>
                </div>
              </div>

              {/* ACTION ICON */}
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#D4AF37]/20 transition-colors">
                <span className="material-icons text-sm text-[#D4AF37]">arrow_forward</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
