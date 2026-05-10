import React, { useState } from 'react';
import { User } from '../../types';
import { Auction, AuctionUser } from '../types';
import { useAuction } from '../hooks/useAuction';

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
    const [submitting, setSubmitting] = useState(false);
    const [lastClickTime, setLastClickTime] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        if (!user || submitting) return;
        
        // Anti-spam: check if last click was less than 2 seconds ago
        const now = Date.now();
        if (now - lastClickTime < 2000) {
            setError('Aguarde um momento antes de dar outro lance.');
            return;
        }

        if (!auctionUser?.can_bid && auctionUser?.auction_role !== 'admin' && auctionUser?.auction_role !== 'seller_approved') {
            setError('Sua conta não está verificada para dar lances.');
            return;
        }

        setSubmitting(true);
        setError(null);
        setLastClickTime(now);

        const result = await placeBid(auction.id, user.id, amount, auction.current_bid);

        if (result.success) {
            onSuccess();
        } else {
            setError(result.error || 'Erro ao realizar lance.');
            setSubmitting(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-md bg-[#1A1108] rounded-t-[40px] sm:rounded-[40px] border border-white/10 shadow-2xl p-8 overflow-hidden animate-in slide-in-from-bottom duration-300">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/10 rounded-full mt-4 sm:hidden" />
                
                <div className="flex items-center justify-between mb-8 pt-4 sm:pt-0">
                    <h2 className="text-xl font-black uppercase tracking-tighter text-white">Dar Lance</h2>
                    <button onClick={onClose} className="text-white/40 material-icons">close</button>
                </div>

                <div className="space-y-6">
                    <div className="text-center">
                        <p className="text-white/20 text-[10px] uppercase font-black tracking-widest mb-1">Lance Atual</p>
                        <p className="text-white text-3xl font-black tracking-tighter">{formatCurrency(auction.current_bid || auction.starting_bid)}</p>
                    </div>

                    <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Seu Novo Lance</p>
                            <p className="text-[#ECA413] text-[8px] font-black uppercase tracking-widest">Min. Incremento: {formatCurrency(auction.minimum_increment)}</p>
                        </div>
                        
                        <div className="flex items-center justify-between gap-4">
                            <button 
                                onClick={() => setAmount(prev => Math.max(auction.current_bid + auction.minimum_increment, prev - 500))}
                                className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white active:scale-90 transition-all"
                            >
                                <span className="material-icons">remove</span>
                            </button>
                            
                            <div className="flex-1 text-center">
                                <p className="text-2xl font-black text-[#ECA413] tracking-tighter">{formatCurrency(amount)}</p>
                            </div>

                            <button 
                                onClick={() => setAmount(prev => prev + 500)}
                                className="w-12 h-12 rounded-full bg-[#ECA413] flex items-center justify-center text-black active:scale-90 transition-all"
                            >
                                <span className="material-icons">add</span>
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
                            <span className="material-icons text-red-500">error_outline</span>
                            <p className="text-red-500 text-[10px] font-bold uppercase tracking-tight leading-tight">{error}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <button 
                            onClick={handleConfirm}
                            disabled={submitting}
                            className={`w-full h-16 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center ${
                                submitting ? 'bg-white/10 text-white/40' : 'bg-[#ECA413] text-black'
                            }`}
                        >
                            {submitting ? 'Processando...' : 'Confirmar Lance'}
                        </button>
                        <p className="text-white/20 text-[8px] text-center uppercase leading-relaxed max-w-[240px] mx-auto">
                            Ao confirmar, você declara que tem interesse real na negociação e aceita as regras do leilão.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BidModal;
