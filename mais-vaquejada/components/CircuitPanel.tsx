import React from 'react';
import { Circuito } from '../types';

interface CircuitPanelProps {
  isOpen: boolean;
  onClose: () => void;
  circuits: Circuito[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const CircuitPanel: React.FC<CircuitPanelProps> = ({ isOpen, onClose, circuits, selectedId, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] flex justify-center items-end sm:items-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-[#0F0A05] rounded-t-[32px] sm:rounded-3xl border sm:border-white/10 border-t border-white/10 p-6 pt-4 animate-in slide-in-from-bottom-full duration-300">
        <h2 className="text-xl font-black uppercase text-white tracking-wide mb-6">Circuitos</h2>
        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto hide-scrollbar">
          {circuits.map((circuito) => (
            <button
              key={circuito.id}
              onClick={() => { onSelect(circuito.id); onClose(); }}
              className={`px-5 py-4 rounded-2xl text-sm font-black text-left flex justify-between items-center transition-all ${selectedId === circuito.id ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
            >
              {circuito.nome}
              {selectedId === circuito.id && <span className="material-icons">check_circle</span>}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="w-full mt-6 py-4 bg-white/5 text-white/40 font-black uppercase text-[10px] tracking-widest rounded-2xl">Fechar</button>
      </div>
    </div>
  );
};

export default CircuitPanel;
