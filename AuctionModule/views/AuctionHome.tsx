import React, { useState } from 'react';
import { User } from '../../types';
import { AuctionUser, Auction } from '../types';
import { useAuction } from '../hooks/useAuction';
import AuctionBanner from '../components/AuctionBanner';
import AuctionFilterChips from '../components/AuctionFilterChips';
import RealtimeCountdown from '../components/RealtimeCountdown';

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
    const [activeFilter, setActiveFilter] = useState('live');

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0F0A05] p-6 space-y-6">
                <div className="h-10 w-48 bg-white/5 rounded-lg animate-pulse mb-8" />
                <div className="h-[380px] w-full bg-white/5 rounded-[40px] animate-pulse" />
                <div className="flex gap-3 overflow-hidden">
                    {[1,2,3].map(i => <div key={i} className="h-10 w-32 bg-white/5 rounded-full shrink-0 animate-pulse" />)}
                </div>
                <div className="space-y-6">
                    {[1,2].map(i => <div key={i} className="h-[400px] w-full bg-white/5 rounded-[40px] animate-pulse" />)}
                </div>
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
    const isAdmin = user.role === 'ADMIN' || auctionUser?.auction_role === 'admin' || user.isMaster;

    const filteredAuctions = auctions.filter(a => {
        if (activeFilter === 'live') return a.status === 'active';
        return true;
    });

    const featuredAuction = auctions.find(a => a.status === 'active');

    return (
        <div className="min-h-screen bg-[#0F0A05] pb-32">
            <header className="px-6 pt-12 pb-8 flex items-center justify-between sticky top-0 bg-[#0F0A05]/80 backdrop-blur-xl z-50">
                <div>
                    <h1 className="text-2xl font-black italic uppercase tracking-tighter text-[#ECA413] leading-none">
                        Leilões Elite
                    </h1>
                    <p className="text-white/40 text-[9px] uppercase font-black tracking-[0.3em] mt-1.5">
                        Exclusividade +Vaquejada
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {isAdmin && (
                        <button 
                            onClick={onAdminPanel} 
                            className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full border border-white/10 active:scale-90 transition-all text-[#ECA413]"
                        >
                            <span className="material-icons text-xl">admin_panel_settings</span>
                        </button>
                    )}
                    <button 
                        onClick={onBack}
                        className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full border border-white/10 active:scale-90 transition-all text-white/40"
                    >
                        <span className="material-icons text-xl">close</span>
                    </button>
                </div>
            </header>

            <div className="px-6 mb-8">
                <div className="bg-[#1A1108] p-1.5 rounded-full border border-white/5 flex items-center gap-1 shadow-2xl">
                    {canSell ? (
                        <button 
                            onClick={onSellerDashboard}
                            className="flex-1 h-11 bg-[#ECA413] text-black rounded-full font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-[#ECA413]/10"
                        >
                            Painel Vendedor
                        </button>
                    ) : isPendingSeller ? (
                        <div className="flex-1 h-11 bg-white/5 text-white/30 rounded-full flex items-center justify-center font-black text-[9px] uppercase tracking-widest border border-white/5">
                            Análise Pendente
                        </div>
                    ) : (
                        <button 
                            onClick={onApplySeller}
                            className="flex-1 h-11 bg-white/5 text-[#ECA413] rounded-full font-black text-[9px] uppercase tracking-widest border border-[#ECA413]/20 active:scale-95 transition-all"
                        >
                            Vender Animal
                        </button>
                    )}
                    <button className="flex-1 h-11 bg-white/5 text-white/40 rounded-full font-black text-[9px] uppercase tracking-widest border border-white/5 active:scale-95 transition-all">
                        Meus Lances
                    </button>
                </div>
            </div>

            {featuredAuction && (
                <AuctionBanner auction={featuredAuction} onView={onViewAuction} />
            )}

            <AuctionFilterChips activeFilter={activeFilter} onFilterChange={setActiveFilter} />

            <div className="px-6 space-y-8">
                {filteredAuctions.length === 0 ? (
                    <div className="py-20 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                            <span className="material-icons text-white/10 text-4xl">gavel</span>
                        </div>
                        <h2 className="text-white/40 font-black uppercase text-sm tracking-widest">Nenhum leilão disponível</h2>
                        <p className="text-white/20 text-[10px] uppercase mt-2 max-w-[200px] leading-relaxed">
                            Confira as próximas datas ou filtre por outras categorias.
                        </p>
                    </div>
                ) : (
                    filteredAuctions.map(auction => (
                        <div 
                            key={auction.id}
                            onClick={() => onViewAuction(auction.id)}
                            className="bg-[#1A1108] rounded-[40px] overflow-hidden border border-white/5 shadow-2xl active:scale-[0.98] transition-all group relative"
                        >
                            <div className="aspect-[16/10] relative">
                                <img 
                                    src={auction.animal?.main_image_url} 
                                    className="w-full h-full object-cover transition-transform duration-[1500ms] group-hover:scale-110" 
                                    alt={auction.animal?.name} 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1108] via-transparent to-transparent opacity-90" />
                                
                                <div className="absolute top-6 left-6 flex flex-col gap-2">
                                    <div className="bg-red-600/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-xl">
                                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                        <span className="text-[9px] font-black text-white uppercase tracking-widest">Ao Vivo</span>
                                    </div>
                                </div>

                                <div className="absolute top-6 right-6 flex flex-col gap-2 items-end">
                                    <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10 flex items-center gap-2">
                                        <span className="material-icons text-[10px] text-[#ECA413]">groups</span>
                                        <span className="text-[9px] font-black text-white/60">{Math.floor(Math.random() * 20 + 5)} Participantes</span>
                                    </div>
                                    <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10 flex items-center gap-2">
                                        <span className="material-icons text-[10px] text-[#ECA413]">visibility</span>
                                        <span className="text-[9px] font-black text-white/60">{Math.floor(Math.random() * 500 + 100)} Vistas</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 -mt-12 relative z-10">
                                <div className="flex justify-between items-end mb-6">
                                    <div>
                                        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white leading-none mb-1 group-hover:text-[#ECA413] transition-colors">{auction.animal?.name}</h3>
                                        <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                            <span className="w-1 h-1 bg-[#ECA413] rounded-full" />
                                            {auction.animal?.breed} • {auction.animal?.sex === 'male' ? 'Macho' : 'Fêmea'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white/20 text-[8px] uppercase font-black tracking-widest mb-1 italic">Lance Atual</p>
                                        <p className="text-[#ECA413] text-2xl font-black tracking-tighter leading-none">{formatCurrency(auction.current_bid || auction.starting_bid)}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-white/20 text-[7px] uppercase font-black tracking-widest">Encerramento</p>
                                        <RealtimeCountdown endDate={auction.end_at} showSeconds={false} />
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-white/60 text-[9px] font-black uppercase tracking-tighter">Último lance</p>
                                            <p className="text-[#ECA413] text-[8px] font-bold">Há {Math.floor(Math.random() * 59 + 1)} segundos</p>
                                        </div>
                                        <div className="w-12 h-12 rounded-2xl bg-[#ECA413] flex items-center justify-center text-black shadow-lg shadow-[#ECA413]/20 group-hover:scale-110 transition-transform">
                                            <span className="material-icons">gavel</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="absolute bottom-0 right-0 w-32 h-32 bg-[#ECA413]/5 blur-[60px] pointer-events-none group-hover:bg-[#ECA413]/10 transition-colors" />
                        </div>
                    ))
                )}
            </div>
            
            {filteredAuctions.length > 0 && (
                <div className="py-20 flex flex-col items-center opacity-20">
                    <div className="w-1 h-12 bg-gradient-to-b from-[#ECA413] to-transparent rounded-full mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.5em]">Fim da Lista Elite</p>
                </div>
            )}
        </div>
    );
};

export default AuctionHome;
