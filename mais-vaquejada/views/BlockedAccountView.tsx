
import React from 'react';

interface BlockedAccountViewProps {
  onLogout: () => void;
}

const BlockedAccountView: React.FC<BlockedAccountViewProps> = ({ onLogout }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F0A05] p-8 text-center animate-in fade-in duration-700">
      <div className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-8 animate-bounce">
        <span className="material-icons text-red-500 text-5xl">gavel</span>
      </div>
      
      <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-4">CONTA <span className="text-red-500">BLOQUEADA</span></h1>
      <p className="text-white/60 text-sm font-bold leading-relaxed mb-10 max-w-xs">
        Seu acesso à Arena Vaquerama foi suspenso por violação de nossas diretrizes de comunidade ou termos de uso.
      </p>

      <div className="w-full max-w-xs space-y-4">
        <a 
          href="https://wa.me/5581900000000" // Placeholder for support
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-white/5 border border-white/10 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          FALAR COM SUPORTE <span className="material-icons text-sm">support_agent</span>
        </a>
        
        <button
          onClick={onLogout}
          className="w-full bg-red-500 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          SAIR DA CONTA <span className="material-icons text-sm">logout</span>
        </button>
      </div>

      <p className="mt-12 text-[10px] text-white/20 font-bold uppercase tracking-[0.2em]">CÓDIGO DE ERRO: ACCOUNT_SUSPENDED</p>
    </div>
  );
};

export default BlockedAccountView;
