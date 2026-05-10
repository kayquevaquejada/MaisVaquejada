import React from 'react';
import { User } from '../../types';
import { AuctionUser, Auction } from '../types';
import { useAuction } from '../hooks/useAuction';

interface AuctionHomeProps {
    user: User | null;
    auctionUser: AuctionUser | null;
    onViewAuction: (id: string) => void;
    onApplySeller: () => void;
    onSellerDashboard: () => void;
    onAdminPanel: () => void;
    onBack: () => void;
}

const AuctionHome: React.FC<AuctionHomeProps> = ({ 
    user, 
    auctionUser, 
    onViewAuction, 
    onApplySeller, 
    onSellerDashboard, 
    onAdminPanel,
    onBack 
}) => {
    const { auctions, loading } = useAuction();

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-10 h-10 border-4 border-[#ECA413]/20 border-t-[#ECA413] rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-[#0F0A05]">
                <div className="w-24 h-24 bg-[#ECA413]/10 rounded-full flex items-center justify-center mb-8">
                    <span className="material-icons text-[#ECA413] text-5xl">gavel</span>
                </div>
                <h1 className="text-[#ECA413] text-3xl font-black uppercase tracking-widest mb-4">Módulo de Leilões</h1>
                <p className="text-white/60 text-lg mb-10 max-w-md leading-relaxed uppercase font-bold tracking-tighter">
                    Leilões de animais dentro do +Vaquejada. Entre na sua conta para acompanhar e participar com segurança.
                </p>
                <div className="flex flex-col gap-4 w-full max-w-xs">
                    <button 
                        onClick={() => window.dispatchEvent(new CustomEvent('arena_show_login'))}
                        className="bg-[#ECA413] text-black h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                    >
                        Entrar ou Cadastrar
                    </button>
                    <button 
                        onClick={onBack}
                        className="text-white/40 h-14 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all"
                    >
                        Voltar ao Início
                    </button>
                </div>
            </div>
        );
    }

    const canSell = auctionUser?.auction_role === 'seller_approved' || auctionUser?.auction_role === 'haras_verified' || auctionUser?.auction_role === 'admin';
    const isPendingSeller = auctionUser?.auction_role === 'seller_pending';
    const isAdmin = user.role === 'ADMIN' || auctionUser?.auction_role === 'admin';

    return (
        <div className="min-h-screen pb-24">
            {/* Header */}
            <div className="px-6 pt-12 pb-6 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-2xl font-black italic uppercase tracking-tighter text-[#ECA413]">Leilões +Vaquejada</h1>
                    {isAdmin && (
                        <button onClick={onAdminPanel} className="text-[#ECA413] material-icons p-2 bg-white/5 rounded-full">admin_panel_settings</button>
                    )}
                </div>
                <p className="text-white/40 text-[10px] uppercase font-bold tracking-[0.2em]">Os melhores animais da arena</p>
            </div>

            {/* Quick Actions */}
            <div className="px-6 mb-8 flex gap-3 overflow-x-auto hide-scrollbar">
                {canSell ? (
                    <button 
                        onClick={onSellerDashboard}
                        className="flex-none px-6 py-3 bg-[#ECA413] text-black rounded-xl font-black text-[10px] uppercase tracking-widest"
                    >
                        Meu Painel Vendedor
                    </button>
                ) : isPendingSeller ? (
                    <div className="flex-none px-6 py-3 bg-white/5 text-white/40 rounded-xl font-black text-[10px] uppercase tracking-widest border border-white/5">
                        Venda em Análise
                    </div>
                ) : (
                    <button 
                        onClick={onApplySeller}
                        className="flex-none px-6 py-3 bg-white/5 text-[#ECA413] rounded-xl font-black text-[10px] uppercase tracking-widest border border-[#ECA413]/20"
                    >
                        Solicitar Autorização para Vender
                    </button>
                )}
                <button className="flex-none px-6 py-3 bg-white/5 text-white/60 rounded-xl font-black text-[10px] uppercase tracking-widest border border-white/10">Meus Lances</button>
            </div>

            {/* Auction List */}
            <div className="px-6 space-y-6">
                {auctions.length === 0 ? (
                    <div className="py-20 flex flex-col items-center text-center">
                        <span className="material-icons text-white/10 text-6xl mb-4">gavel</span>
                        <h2 className="text-white/40 font-black uppercase text-sm tracking-widest">Nenhum leilão ativo</h2>
                        <p className="text-white/20 text-[10px] uppercase mt-2 max-w-[200px]">Em breve, os primeiros animais estarão disponíveis aqui.</p>
                    </div>
                ) : (
                    auctions.map(auction => (
                        <div 
                            key={auction.id}
                            onClick={() => onViewAuction(auction.id)}
                            className="bg-[#1A1108] rounded-3xl overflow-hidden border border-white/5 shadow-2xl active:scale-[0.98] transition-all group"
                        >
                            <div className="aspect-[4/3] relative">
                                <img 
                                    src={auction.animal?.main_image_url} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                    alt={auction.animal?.name} 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0F0A05] via-transparent to-transparent opacity-60" />
                                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                                    <span className="text-[10px] font-black text-[#ECA413] uppercase tracking-widest">
                                        {auction.status === 'active' ? '● Ao Vivo' : 'Programado'}
                                    </span>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-1">{auction.animal?.name}</h3>
                                        <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">
                                            {auction.animal?.breed} • {auction.animal?.sex === 'male' ? 'Macho' : 'Fêmea'} • {auction.animal?.age}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white/20 text-[8px] uppercase font-bold mb-1">Lance Atual</p>
                                        <p className="text-[#ECA413] text-lg font-black tracking-tighter">{formatCurrency(auction.current_bid || auction.starting_bid)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2 text-white/40">
                                        <span className="material-icons text-sm">schedule</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Termina em 2d 4h</span>
                                    </div>
                                    <span className="material-icons text-[#ECA413]">arrow_forward</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Back Button Overlay */}
            <button 
                onClick={onBack}
                className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full flex items-center gap-2 active:scale-95 transition-all z-50"
            >
                <span className="material-icons text-sm text-white/40">arrow_back</span>
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Voltar ao Início</span>
            </button>
        </div>
    );
};

export default AuctionHome;
