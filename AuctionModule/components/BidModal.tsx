import React, { useState } from 'react';
import { Auction, AuctionUser, Bid } from '../types';
import { useAuction } from '../hooks/useAuction';
import { User } from '../../types';

interface BidModalProps {
    auction: Auction;
    user: User | null;
    auctionUser: AuctionUser | null;
    onClose: () => void;
    onSuccess: () => void;
}

const BidModal: React.FC<BidModalProps> = ({ auction, user, auctionUser, onClose, onSuccess }) => {
    const { placeBid } = useAuction();
    const [amount, setAmount] = useState(auction.current_bid ? auction.current_bid + auction.minimum_increment : auction.starting_bid);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [cooldown, setCooldown] = useState(false);

    const increment = auction.minimum_increment;
    const minBid = auction.current_bid ? auction.current_bid + increment : auction.starting_bid;

    const handleBid = async () => {
        if (!user || cooldown || status === 'loading') return;
        
        if (amount < minBid) {
            setErrorMessage(`Lance mínimo permitido: ${formatCurrency(minBid)}`);
            setStatus('error');
            return;
        }

        setLoading(true);
        setStatus('loading');
        setCooldown(true);

        try {
            const { success, error } = await placeBid(auction.id, amount);
            
            if (success) {
                setStatus('success');
                setTimeout(() => {
                    onSuccess();
                }, 1500);
            } else {
                setErrorMessage(error || 'Erro ao processar lance');
                setStatus('error');
                setTimeout(() => setStatus('idle'), 3000);
            }
        } catch (err) {
            setErrorMessage('Falha na conexão');
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
        } finally {
            setLoading(false);
            setTimeout(() => setCooldown(false), 2000);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-[#0F0A05]/95 backdrop-blur-xl" onClick={onClose} />
            
            <div className="bg-[#1A1108] w-full max-w-md rounded-[40px] border border-white/10 shadow-[0_0_100px_rgba(234,164,19,0.1)] overflow-hidden relative animate-in zoom-in slide-in-from-bottom-10 duration-500">
                {/* Header */}
                <div className="p-8 border-b border-white/5 relative">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
                            <span className="material-icons">close</span>
                        </button>
                        <span className="text-[10px] font-black text-[#ECA413] uppercase tracking-[0.3em] italic">Confirmar Lance</span>
                        <div className="w-6" />
                    </div>
                    
                    <div className="text-center">
                        <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-2">Você está ofertando por</p>
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">{auction.animal?.name}</h2>
                    </div>
                </div>

                <div className="p-8 space-y-10">
                    {/* Value Selection */}
                    <div className="flex flex-col items-center">
                        <p className="text-white/20 text-[8px] font-black uppercase tracking-[0.4em] mb-6">Valor do Lance</p>
                        
                        <div className="flex items-center gap-8">
                            <button 
                                onClick={() => setAmount(prev => Math.max(minBid, prev - increment))}
                                className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all hover:border-[#ECA413]/40"
                            >
                                <span className="material-icons">remove</span>
                            </button>
                            
                            <div className="text-center min-w-[200px]">
                                <p className="text-[#ECA413] text-5xl font-black tracking-tighter animate-in zoom-in duration-300">{formatCurrency(amount)}</p>
                                <p className="text-white/20 text-[9px] font-bold uppercase mt-2">Próximo lance mínimo: {formatCurrency(minBid)}</p>
                            </div>

                            <button 
                                onClick={() => setAmount(prev => prev + increment)}
                                className="w-14 h-14 rounded-2xl bg-[#ECA413]/10 border border-[#ECA413]/20 flex items-center justify-center text-[#ECA413] active:scale-90 transition-all hover:bg-[#ECA413]/20"
                            >
                                <span className="material-icons">add</span>
                            </button>
                        </div>
                    </div>

                    {/* Quick Presets */}
                    <div className="grid grid-cols-3 gap-3">
                        {[increment, increment * 5, increment * 10].map(val => (
                            <button 
                                key={val}
                                onClick={() => setAmount(prev => prev + val)}
                                className="py-3 bg-white/5 rounded-xl border border-white/5 text-white/60 text-[9px] font-black uppercase tracking-widest hover:border-[#ECA413]/20 hover:text-[#ECA413] transition-all"
                            >
                                + {formatCurrency(val)}
                            </button>
                        ))}
                    </div>

                    {/* Status Message */}
                    {status === 'error' && (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl animate-in shake duration-300">
                            <p className="text-red-500 text-[10px] font-black text-center uppercase tracking-widest">{errorMessage}</p>
                        </div>
                    )}

                    {/* Action Button */}
                    <button 
                        onClick={handleBid}
                        disabled={loading || status === 'success'}
                        className={`w-full h-18 rounded-2xl font-black uppercase tracking-[0.3em] text-sm shadow-2xl transition-all duration-500 flex items-center justify-center gap-3 relative overflow-hidden ${
                            status === 'success' ? 'bg-green-600 text-white' :
                            status === 'error' ? 'bg-red-600 text-white' :
                            'bg-[#ECA413] text-black active:scale-95'
                        }`}
                    >
                        {status === 'loading' ? (
                            <>
                                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                <span>PROCESSANDO...</span>
                            </>
                        ) : status === 'success' ? (
                            <>
                                <span className="material-icons">check_circle</span>
                                <span>LANCE ENVIADO ✓</span>
                            </>
                        ) : status === 'error' ? (
                            <>
                                <span className="material-icons">error_outline</span>
                                <span>ERRO AO ENVIAR</span>
                            </>
                        ) : (
                            <>
                                <span className="material-icons">gavel</span>
                                <span>CONFIRMAR LANCE</span>
                            </>
                        )}
                        
                        {/* Cooldown Overlay */}
                        {cooldown && status === 'idle' && (
                            <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />
                        )}
                    </button>
                </div>

                {/* Info Footer */}
                <div className="p-8 bg-white/5 flex items-center gap-4 border-t border-white/5">
                    <span className="material-icons text-white/20">shield</span>
                    <p className="text-white/20 text-[8px] font-bold uppercase leading-relaxed tracking-widest">
                        Seu lance é um compromisso de compra. A integridade do leilão é protegida por criptografia de ponta a ponta.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BidModal;
