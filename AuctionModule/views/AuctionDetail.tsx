import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { User } from '../../types';
import { Auction, AuctionUser, Bid } from '../types';
import { useAuction } from '../hooks/useAuction';
import BidModal from '../components/BidModal';

interface AuctionDetailProps {
    id: string;
    user: User | null;
    auctionUser: AuctionUser | null;
    onBack: () => void;
}

const AuctionDetail: React.FC<AuctionDetailProps> = ({ id, user, auctionUser, onBack }) => {
    const { getAuctionDetails, getAuctionBids } = useAuction();
    const [auction, setAuction] = useState<Auction | null>(null);
    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'info' | 'videos' | 'pedigree' | 'history'>('info');
    const [showBidModal, setShowBidModal] = useState(false);

    useEffect(() => {
        loadData();
        
        // Subscription for real-time bids
        const channel = supabase
            .channel(`auction_bids:${id}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'auction_bids', 
                filter: `auction_id=eq.${id}` 
            }, () => {
                loadData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id]);

    const loadData = async () => {
        const details = await getAuctionDetails(id);
        if (details) {
            setAuction(details);
            const auctionBids = await getAuctionBids(id);
            setBids(auctionBids);
        }
        setLoading(false);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    if (loading || !auction) {
        return (
            <div className="min-h-screen bg-[#0F0A05] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#ECA413]/20 border-t-[#ECA413] rounded-full animate-spin" />
            </div>
        );
    }

    const animal = auction.animal;

    return (
        <div className="min-h-screen bg-[#0F0A05] pb-32">
            {/* Gallery / Image */}
            <div className="relative aspect-[4/3] w-full">
                <img src={animal?.main_image_url} className="w-full h-full object-cover" alt={animal?.name} />
                <button 
                    onClick={onBack}
                    className="absolute top-12 left-6 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10"
                >
                    <span className="material-icons">arrow_back</span>
                </button>
            </div>

            {/* Content */}
            <div className="px-6 -mt-8 relative z-10">
                <div className="bg-[#1A1108] rounded-3xl p-6 border border-white/5 shadow-2xl">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tighter text-white mb-1">{animal?.name}</h1>
                            <p className="text-[#ECA413] text-[10px] font-black uppercase tracking-widest">{animal?.breed} • {animal?.sex === 'male' ? 'Macho' : 'Fêmea'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-white/20 text-[8px] uppercase font-bold mb-1">Lance Atual</p>
                            <p className="text-[#ECA413] text-2xl font-black tracking-tighter">{formatCurrency(auction.current_bid || auction.starting_bid)}</p>
                        </div>
                    </div>

                    {/* Auction Status Bar */}
                    <div className="bg-white/5 rounded-2xl p-4 flex items-center justify-between mb-8 border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#ECA413]/10 flex items-center justify-center">
                                <span className="material-icons text-[#ECA413] text-xl">timer</span>
                            </div>
                            <div>
                                <p className="text-white/20 text-[8px] uppercase font-black">Tempo Restante</p>
                                <p className="text-white text-xs font-black uppercase tracking-tighter">02d 04h 21min</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowBidModal(true)}
                            className="bg-[#ECA413] text-black px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg"
                        >
                            Dar Lance
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 border-b border-white/5 mb-6 overflow-x-auto hide-scrollbar">
                        <button 
                            onClick={() => setActiveTab('info')}
                            className={`pb-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'info' ? 'text-[#ECA413] border-b-2 border-[#ECA413]' : 'text-white/20'}`}
                        >
                            Informações
                        </button>
                        <button 
                            onClick={() => setActiveTab('videos')}
                            className={`pb-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'videos' ? 'text-[#ECA413] border-b-2 border-[#ECA413]' : 'text-white/20'}`}
                        >
                            Vídeos
                        </button>
                        <button 
                            onClick={() => setActiveTab('pedigree')}
                            className={`pb-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pedigree' ? 'text-[#ECA413] border-b-2 border-[#ECA413]' : 'text-white/20'}`}
                        >
                            Pedigree
                        </button>
                        <button 
                            onClick={() => setActiveTab('history')}
                            className={`pb-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'text-[#ECA413] border-b-2 border-[#ECA413]' : 'text-white/20'}`}
                        >
                            Histórico
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-[200px]">
                        {activeTab === 'info' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                        <p className="text-white/20 text-[8px] uppercase font-bold mb-1">Pelagem</p>
                                        <p className="text-white text-xs font-black">{animal?.coat || 'N/A'}</p>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                        <p className="text-white/20 text-[8px] uppercase font-bold mb-1">Idade</p>
                                        <p className="text-white text-xs font-black">{animal?.age}</p>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                        <p className="text-white/20 text-[8px] uppercase font-bold mb-1">Localização</p>
                                        <p className="text-white text-xs font-black">{animal?.city}/{animal?.state}</p>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                        <p className="text-white/20 text-[8px] uppercase font-bold mb-1">Registro</p>
                                        <p className="text-white text-xs font-black">{animal?.registration_number || 'Não Informado'}</p>
                                    </div>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 mt-4">
                                    <p className="text-white/20 text-[8px] uppercase font-bold mb-2">Descrição</p>
                                    <p className="text-white/60 text-xs leading-relaxed">{animal?.description}</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="space-y-3">
                                {bids.length === 0 ? (
                                    <p className="text-white/20 text-center py-10 text-[10px] uppercase font-black">Nenhum lance realizado ainda</p>
                                ) : (
                                    bids.map((bid, index) => (
                                        <div key={bid.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-white/20'}`} />
                                                <p className="text-white text-xs font-bold uppercase tracking-tight">Usuário {bid.bidder_id.substring(0, 5)}***</p>
                                            </div>
                                            <p className={`text-sm font-black tracking-tighter ${index === 0 ? 'text-[#ECA413]' : 'text-white/40'}`}>{formatCurrency(bid.amount)}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bid Modal */}
            {showBidModal && (
                <BidModal 
                    auction={auction}
                    user={user}
                    auctionUser={auctionUser}
                    onClose={() => setShowBidModal(false)}
                    onSuccess={() => {
                        setShowBidModal(false);
                        loadData();
                    }}
                />
            )}
        </div>
    );
};

export default AuctionDetail;
