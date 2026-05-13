import React from 'react';
import { AppUpdate } from '@capawesome/capacitor-app-update';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateUrl?: string;
}

const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, onClose, updateUrl }) => {
  if (!isOpen) return null;

  const handleUpdate = async () => {
    if (updateUrl) {
      window.open(updateUrl, '_blank');
    } else {
      await AppUpdate.openAppStore();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-[#1A1108] border border-[#ECA413]/30 rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
        <div className="p-8 text-center">
          {/* Icon Section */}
          <div className="w-20 h-20 bg-[#ECA413]/10 rounded-full flex items-center justify-center mb-6 mx-auto">
            <span className="material-icons text-[#ECA413] text-4xl animate-bounce">system_update</span>
          </div>

          <h2 className="text-[#ECA413] text-2xl font-black italic uppercase tracking-tighter mb-4">
            Nova versão disponível
          </h2>
          
          <p className="text-white/60 text-sm mb-8 leading-relaxed">
            Temos melhorias importantes para você! Atualize o app para continuar com a melhor experiência na Arena +Vaquejada.
          </p>

          <div className="space-y-4">
            <button
              onClick={handleUpdate}
              className="w-full bg-[#ECA413] text-black py-4 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all hover:bg-[#FFB423]"
            >
              Atualizar agora
            </button>
            
            <button
              onClick={onClose}
              className="w-full text-white/40 py-2 rounded-full font-bold text-[10px] uppercase tracking-widest hover:text-white/60 transition-all"
            >
              Lembrar depois
            </button>
          </div>
        </div>
        
        {/* Aesthetic Detail */}
        <div className="h-1 bg-gradient-to-r from-transparent via-[#ECA413] to-transparent opacity-30" />
      </div>
    </div>
  );
};

export default UpdateModal;
