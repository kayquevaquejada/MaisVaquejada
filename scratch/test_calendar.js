
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MONTH_ABBRS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const events = [
  {"id":"a97a9c03-4e06-4b2a-9192-ded5aa5539b9","title":"Parque Arena Canindezinho","start_date":"2026-05-06","date_day":"06, 07, 08, 09 e 10","date_month":"Mai"},
  {"id":"82e309f0-3822-4538-80ce-c0d10c92c061","title":"Arena JS Rocha","start_date":"2026-05-06","date_day":"06, 07, 08, 09 e 10","date_month":"Mai"}
];

function getEventsForDate(date, events) {
    return events.filter(ev => {
      // Prioridade 1: Datas estruturadas
      if (ev.start_date) {
        try {
          const evStart = new Date(ev.start_date + 'T00:00:00');
          const evEnd = ev.end_date ? new Date(ev.end_date + 'T23:59:59') : evStart;
          
          const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const sDate = new Date(evStart.getFullYear(), evStart.getMonth(), evStart.getDate());
          const eDate = new Date(evEnd.getFullYear(), evEnd.getMonth(), evEnd.getDate());
          
          if (checkDate >= sDate && checkDate <= eDate) return true;
        } catch (e) {
          console.warn('Erro ao processar data estruturada:', ev.start_date);
        }
      }
      
      // Prioridade 2: Fallback
      if (ev.date_month && ev.date_day) {
        const monthInput = ev.date_month.toLowerCase().trim();
        const monthIndex = MONTHS.findIndex((m, idx) => 
          m.toLowerCase() === monthInput || 
          m.toLowerCase().startsWith(monthInput) ||
          MONTH_ABBRS[idx] === monthInput ||
          monthInput.startsWith(MONTH_ABBRS[idx])
        );

        if (monthIndex === date.getMonth()) {
          const dayNum = date.getDate().toString();
          const paddedDayNum = dayNum.padStart(2, '0');
          
          const dayRegex = new RegExp(`(^|\\D)${dayNum}(\\D|$)`);
          const paddedDayRegex = new RegExp(`(^|\\D)${paddedDayNum}(\\D|$)`);
          
          if (dayRegex.test(ev.date_day) || paddedDayRegex.test(ev.date_day)) return true;
        }
      }

      return false;
    });
}

const today = new Date(2026, 4, 9); // May 9, 2026
console.log('Testing for May 9, 2026');
const found = getEventsForDate(today, events);
console.log('Found:', found.map(e => e.title));
