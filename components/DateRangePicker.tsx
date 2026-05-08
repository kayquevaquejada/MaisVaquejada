import React, { useState } from 'react';

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onChange: (start: string, end: string) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onChange }) => {
  const [sDate, setSDate] = useState(startDate || '');
  const [eDate, setEDate] = useState(endDate || '');

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSDate(val);
    if (!eDate || new Date(eDate) < new Date(val)) {
      setEDate(val);
      onChange(val, val);
    } else {
      onChange(val, eDate);
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEDate(val);
    onChange(sDate, val);
  };

  return (
    <div className="flex gap-4 w-full">
      <div className="flex-1">
        <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-2 block">Data de Início</label>
        <div className="relative">
          <input 
            type="date" 
            value={sDate}
            onChange={handleStartChange}
            className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-sm text-white font-bold focus:border-[#D4AF37] outline-none shadow-sm appearance-none"
            style={{ colorScheme: 'dark' }}
          />
        </div>
      </div>
      <div className="flex-1">
        <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-2 block">Data de Fim</label>
        <div className="relative">
          <input 
            type="date" 
            value={eDate}
            min={sDate}
            onChange={handleEndChange}
            className="w-full bg-[#1A1108] border border-white/10 rounded-xl p-4 text-sm text-white font-bold focus:border-[#D4AF37] outline-none shadow-sm appearance-none"
            style={{ colorScheme: 'dark' }}
          />
        </div>
      </div>
    </div>
  );
};
