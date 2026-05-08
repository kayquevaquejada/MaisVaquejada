import React, { useState, useMemo } from 'react';
import { EventItem } from '../types';

interface VaquejadaCalendarProps {
  events: EventItem[];
  onSelectDate: (date: Date, eventsOnDate: EventItem[]) => void;
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export const VaquejadaCalendar: React.FC<VaquejadaCalendarProps> = ({ events, onSelectDate }) => {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  // Gera a matriz do calendário para o mês selecionado
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    // Empty slots antes do 1o dia
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Dias do mês
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  }, [currentDate]);

  // Função para verificar se existe evento num determinado dia
  const getEventsForDate = (date: Date): EventItem[] => {
    return events.filter(ev => {
      if (!ev.start_date) return false;
      
      const evStart = new Date(ev.start_date + 'T00:00:00');
      const evEnd = ev.end_date ? new Date(ev.end_date + 'T23:59:59') : evStart;
      
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const sDate = new Date(evStart.getFullYear(), evStart.getMonth(), evStart.getDate());
      const eDate = new Date(evEnd.getFullYear(), evEnd.getMonth(), evEnd.getDate());
      
      return checkDate >= sDate && checkDate <= eDate;
    });
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  return (
    <div className="bg-[#1A1108]/80 backdrop-blur-md rounded-3xl border border-[#D4AF37]/20 p-5 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#D4AF37]/10 via-transparent to-transparent pointer-events-none"></div>
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <button onClick={prevMonth} className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 text-white/70 hover:text-[#D4AF37] hover:bg-white/10 active:scale-95 transition-all">
          <span className="material-icons">chevron_left</span>
        </button>
        
        <h2 className="text-lg font-black uppercase text-white tracking-widest">
          {MONTHS[currentDate.getMonth()]} <span className="text-[#D4AF37]">{currentDate.getFullYear()}</span>
        </h2>
        
        <button onClick={nextMonth} className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 text-white/70 hover:text-[#D4AF37] hover:bg-white/10 active:scale-95 transition-all">
          <span className="material-icons">chevron_right</span>
        </button>
      </div>

      {/* WEEK DAYS */}
      <div className="grid grid-cols-7 gap-1 mb-2 relative z-10">
        {DAYS.map((d, i) => (
          <div key={`wd-${i}`} className="text-center text-[10px] font-black text-white/40 uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* DAYS GRID */}
      <div className="grid grid-cols-7 gap-1.5 relative z-10">
        {calendarDays.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="h-10" />;
          
          const dayEvents = getEventsForDate(day);
          const hasEvents = dayEvents.length > 0;
          const isToday = day.toDateString() === today.toDateString();
          const isHighlight = dayEvents.some(e => e.is_highlight);

          return (
            <button
              key={`day-${idx}`}
              onClick={() => hasEvents && onSelectDate(day, dayEvents)}
              disabled={!hasEvents}
              className={`
                h-10 w-full rounded-xl flex flex-col items-center justify-center relative transition-all duration-300
                ${hasEvents ? 'cursor-pointer hover:scale-105 active:scale-95' : 'opacity-30 cursor-default'}
                ${isToday && !hasEvents ? 'border border-[#D4AF37]/50 text-[#D4AF37]' : ''}
                ${hasEvents ? 'bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-white' : 'text-white/50'}
              `}
            >
              <span className={`text-sm font-bold ${hasEvents ? 'text-white' : ''}`}>
                {day.getDate()}
              </span>
              
              {/* Pontinhos para indicar eventos */}
              {hasEvents && (
                <div className="absolute bottom-1 flex gap-0.5">
                  {dayEvents.slice(0,3).map((e, i) => (
                    <div 
                      key={i} 
                      className={`w-1.5 h-1.5 rounded-full ${e.is_highlight || isHighlight ? 'bg-[#D4AF37] shadow-[0_0_5px_#D4AF37]' : 'bg-white/70'}`}
                    />
                  ))}
                  {dayEvents.length > 3 && <div className="w-1.5 h-1.5 rounded-full bg-white/40" />}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
