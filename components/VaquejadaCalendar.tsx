import React, { useState, useMemo } from 'react';
import { EventItem } from '../types';

interface VaquejadaCalendarProps {
  events: EventItem[];
  selectedDate?: Date | null;
  onSelectDate: (date: Date, eventsOnDate: EventItem[]) => void;
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export const VaquejadaCalendar: React.FC<VaquejadaCalendarProps> = ({ events, selectedDate, onSelectDate }) => {
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

  // Função aprimorada para verificar eventos em um dia específico
  // Agora aceita datas estruturadas (start_date/end_date) ou campos legados date_month/date_day.
  // Para date_day aceita valores individuais ou listas separadas por vírgula/espço (ex.: "1,2,3" ou "1 2 3").
  const getEventsForDate = (date: Date): EventItem[] => {
    const MONTH_ABBRS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

    return events.filter(ev => {
      // 1️⃣ Datas estruturadas (novos eventos)
      if (ev.start_date) {
        try {
          const evStart = new Date(ev.start_date + 'T00:00:00');
          const evEnd = ev.end_date ? new Date(ev.end_date + 'T23:59:59') : evStart;
          const check = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          if (check >= evStart && check <= evEnd) return true;
        } catch {
          console.warn('Erro ao processar data estruturada:', ev.start_date);
        }
      }

      // 2️⃣ Campos legados (date_month & date_day)
      if (ev.date_month && ev.date_day != null) {
        const monthInput = ev.date_month.toString().toLowerCase().trim();
        const monthIdx = MONTHS.findIndex((m, i) =>
          m.toLowerCase() === monthInput ||
          m.toLowerCase().startsWith(monthInput) ||
          MONTH_ABBRS[i] === monthInput ||
          monthInput.startsWith(MONTH_ABBRS[i])
        );
        if (monthIdx !== date.getMonth()) return false;

        // aceita número único ou lista de dias
        const dayStr = ev.date_day.toString();
        const possibleDays = dayStr.split(/[ ,]+/).map(d => parseInt(d, 10)).filter(n => !isNaN(n));
        return possibleDays.includes(date.getDate());
      }
      return false;
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
          const isSelected = selectedDate?.toDateString() === day.toDateString();
          const isHighlight = dayEvents.some(e => e.is_highlight);

          return (
            <button
              key={`day-${idx}`}
              onClick={() => {
                console.log('CALENDAR_DEBUG: Clicked day', day.toDateString(), 'Events:', dayEvents.length);
                onSelectDate(day, dayEvents);
              }}
              disabled={!hasEvents && !isToday}
              className={`
                h-10 w-full rounded-xl flex flex-col items-center justify-center relative transition-all duration-300
                ${hasEvents || isToday ? 'cursor-pointer hover:scale-105 active:scale-95' : 'opacity-20 cursor-default'}
                ${isSelected ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.5)] z-20 scale-110' : 
                  isToday ? 'border border-[#D4AF37] bg-[#D4AF37]/5 text-[#D4AF37]' : 
                  hasEvents ? 'bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-white' : 'text-white/50'}
              `}
            >
              <span className={`text-sm font-black ${isSelected ? 'text-black' : (hasEvents || isToday) ? 'text-white' : ''}`}>
                {day.getDate()}
              </span>
              
              {/* Pontinhos para indicar eventos */}
              {hasEvents && !isSelected && (
                <div className="absolute bottom-1 flex gap-0.5">
                  {dayEvents.slice(0,3).map((e, i) => (
                    <div 
                      key={i} 
                      className={`w-1 h-1 rounded-full ${e.is_highlight || isHighlight ? 'bg-[#D4AF37]' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
              )}

              {/* Indicador de "Hoje" se não estiver selecionado */}
              {isToday && !isSelected && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#D4AF37] rounded-full border border-black animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

