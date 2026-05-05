
import React from 'react';
import { View } from '../types';

interface LoginRequiredModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const LoginRequiredModal: React.FC<LoginRequiredModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const handleNavigate = (view: View) => {
        onClose();
        window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view } }));
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden group">
                {/* Background graphic */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#ECA413]/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700" />
                
                <div className="w-20 h-20 bg-[#ECA413]/10 rounded-full flex items-center justify-center mb-6 mx-auto relative z-10">
                    <span className="material-icons text-[#ECA413] text-4xl">account_circle</span>
                </div>

                <h3 className="text-2xl font-black text-center text-[#1A1108] uppercase italic tracking-tighter mb-2 relative z-10">Acesse sua conta</h3>
                <p className="text-center text-sm font-medium text-black/60 leading-relaxed mb-8 px-4 relative z-10">
                    Crie uma conta ou entre para continuar e aproveitar todos os recursos da Arena.
                </p>
                
                <div className="space-y-3 relative z-10">
                    <button 
                        onClick={() => handleNavigate(View.LOGIN)}
                        className="w-full bg-black text-white py-5 rounded-3xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-black/20 active:scale-95 transition-all"
                    >
                        Entrar na Arena
                    </button>
                    
                    <button 
                        onClick={() => handleNavigate(View.SIGNUP)}
                        className="w-full bg-white text-black border-2 border-black/5 py-5 rounded-3xl font-black uppercase text-[11px] tracking-[0.2em] active:scale-95 transition-all"
                    >
                        Criar Nova Conta
                    </button>
                    
                    <button 
                        onClick={onClose}
                        className="w-full text-black/40 py-2 font-black uppercase text-[10px] tracking-widest active:opacity-60 transition-all mt-2"
                    >
                        Continuar explorando
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginRequiredModal;
