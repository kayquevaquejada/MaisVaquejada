import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { User } from '../../types';
import { Auction, AuctionUser, Bid } from '../types';
import { useAuction } from '../hooks/useAuction';
import BidModal from '../components/BidModal';
import RealtimeCountdown from '../components/RealtimeCountdown';

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
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
    const isFinished = new Date(auction.end_at) < new Date();
    
    // Mock images array (if only one image exists, use it)
    const images = [animal?.main_image_url, ...(animal?.gallery_image_urls || [])].filter(Boolean);

    return (
        <div className="min-h-screen bg-[#0F0A05] pb-32">
            {/* Premium Header / Carousel */}
            <div className="relative aspect-[4/5] w-full overflow-hidden">
                <div 
                    className="flex transition-transform duration-700 ease-out h-full"
                    style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
                >
                    {images.map((img, i) => (
                        <img key={i} src={img} className="w-full h-full object-cover shrink-0" alt={`${animal?.name} ${i}`} />
                    ))}
                </div>
                
                {/* Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F0A05] via-transparent to-black/20" />
                
                {/* Floating Controls */}
                <button 
                    onClick={onBack}
                    className="absolute top-12 left-6 w-12 h-12 bg-black/40 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white border border-white/10 active:scale-90 transition-all z-20"
                >
                    <span className="material-icons">arrow_back</span>
                </button>

                {/* Badges Overlay */}
                <div className="absolute top-12 right-6 flex flex-col gap-3 items-end z-20">
                    <div className="bg-red-600 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-2xl">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Ao Vivo</span>
                    </div>
                    <div className="bg-black/60 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                        <span className="material-icons text-xs text-[#ECA413]">visibility</span>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{Math.floor(Math.random() * 300 + 50)} Vistas</span>
                    </div>
                </div>

                {/* Carousel Dots */}
                {images.length > 1 && (
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                        {images.map((_, i) => (
                            <div 
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-300 ${currentImageIndex === i ? 'w-8 bg-[#ECA413]' : 'w-1.5 bg-white/20'}`}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Content Card */}
            <div className="px-6 -mt-16 relative z-10">
                <div className="bg-[#1A1108] rounded-[40px] p-8 border border-white/10 shadow-2xl relative overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#ECA413]/5 blur-[100px] pointer-events-none" />

                    <div className="flex justify-between items-start mb-8 relative z-10">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-[#ECA413]/10 text-[#ECA413] text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-md border border-[#ECA413]/20">Lote #001</span>
                                <div className="flex items-center gap-1 text-white/40">
                                    <span className="material-icons text-[10px]">location_on</span>
                                    <span className="text-[8px] font-black uppercase tracking-widest">{animal?.city}, {animal?.state}</span>
                                </div>
                            </div>
                            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white leading-none mb-1">{animal?.name}</h1>
                            <p className="text-[#ECA413] text-[10px] font-black uppercase tracking-[0.3em]">{animal?.breed} • {animal?.sex === 'male' ? 'Macho' : 'Fêmea'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-white/20 text-[9px] uppercase font-black tracking-widest mb-1 italic">Lance Atual</p>
                            <p className="text-[#ECA413] text-3xl font-black tracking-tighter leading-none">{formatCurrency(auction.current_bid || auction.starting_bid)}</p>
                            <p className="text-white/40 text-[8px] font-bold uppercase mt-1">Lances: {bids.length}</p>
                        </div>
                    </div>

                    {/* Verified Seller Badge */}
                    <div className="flex items-center gap-3 p-4 bg-white/5 rounded-3xl border border-white/5 mb-8">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#ECA413] to-[#1A1108] rounded-2xl flex items-center justify-center shadow-lg">
                            <span className="material-icons text-white">store</span>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                                <p className="text-white text-xs font-black uppercase tracking-tight">Haras Teste +Vaquejada</p>
                                <span className="material-icons text-[#ECA413] text-sm">verified</span>
                            </div>
                            <p className="text-[#ECA413] text-[8px] font-black uppercase tracking-widest mt-0.5">Vendedor Premium Verificado</p>
                        </div>
                        <div className="text-right px-3 border-l border-white/10">
                            <div className="flex items-center gap-1">
                                <span className="material-icons text-[10px] text-yellow-500">star</span>
                                <span className="text-[10px] font-black text-white">4.9</span>
                            </div>
                            <p className="text-white/20 text-[7px] uppercase font-black">Reputação</p>
                        </div>
                    </div>

                    {/* Stats Ribbon */}
                    <div className="grid grid-cols-3 gap-3 mb-8">
                        <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex flex-col items-center">
                            <span className="material-icons text-white/20 text-sm mb-1">groups</span>
                            <p className="text-white text-xs font-black">{Math.floor(Math.random() * 15 + 5)}</p>
                            <p className="text-white/20 text-[7px] uppercase font-bold">Interessados</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex flex-col items-center">
                            <span className="material-icons text-white/20 text-sm mb-1">local_fire_department</span>
                            <p className="text-white text-xs font-black">{Math.floor(Math.random() * 10 + 2)}</p>
                            <p className="text-white/20 text-[7px] uppercase font-bold">Pessoas Vendo</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex flex-col items-center">
                            <span className="material-icons text-white/20 text-sm mb-1">trending_up</span>
                            <p className="text-white text-xs font-black">{bids.length > 0 ? '+12%' : 'Início'}</p>
                            <p className="text-white/20 text-[7px] uppercase font-bold">Atividade</p>
                        </div>
                    </div>

                    {/* Auction Status / Countdown Bar */}
                    <div className="bg-gradient-to-r from-[#D4AF37] to-[#1A1108] rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl shadow-[#D4AF37]/10">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-black/20 flex items-center justify-center border border-white/10">
                                <span className="material-icons text-white text-2xl">timer</span>
                            </div>
                            <div>
                                <p className="text-black/60 text-[8px] uppercase font-black tracking-widest mb-1">Encerramento em</p>
                                <RealtimeCountdown endDate={auction.end_at} />
                            </div>
                        </div>
                        
                        {!isFinished ? (
                            <button 
                                onClick={() => setShowBidModal(true)}
                                className="w-full sm:w-auto bg-black text-[#ECA413] px-10 py-4 rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] active:scale-95 transition-all shadow-xl hover:shadow-black/40"
                            >
                                Dar Lance
                            </button>
                        ) : (
                            <div className="bg-black/20 px-8 py-4 rounded-2xl border border-white/10 text-white font-black uppercase text-[10px] tracking-widest">
                                Leilão Encerrado
                            </div>
                        )}
                    </div>

                    {/* Tabs Navigation */}
                    <div className="flex gap-8 border-b border-white/5 mt-12 mb-8 overflow-x-auto hide-scrollbar">
                        {['info', 'videos', 'pedigree', 'history'].map((tab) => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap relative ${activeTab === tab ? 'text-[#ECA413]' : 'text-white/20'}`}
                            >
                                {tab === 'info' && 'Ficha Técnica'}
                                {tab === 'videos' && 'Vídeos'}
                                {tab === 'pedigree' && 'Pedigree'}
                                {tab === 'history' && 'Histórico'}
                                {activeTab === tab && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ECA413] rounded-full animate-in zoom-in duration-300" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-[300px]">
                        {activeTab === 'info' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="grid grid-cols-2 gap-4">
                                    <DetailItem label="Pelagem" value={animal?.coat} />
                                    <DetailItem label="Idade" value={animal?.age} />
                                    <DetailItem label="Registro" value={animal?.registration_number} />
                                    <DetailItem label="Altura" value={animal?.height} />
                                    <DetailItem label="Peso" value={animal?.weight} />
                                    <DetailItem label="Cidade/UF" value={`${animal?.city}/${animal?.state}`} />
                                </div>
                                <div className="mt-8 bg-white/5 p-6 rounded-3xl border border-white/5">
                                    <h4 className="text-white/20 text-[9px] uppercase font-black tracking-widest mb-4 flex items-center gap-2">
                                        <span className="material-icons text-sm">description</span>
                                        Descrição do Animal
                                    </h4>
                                    <p className="text-white/70 text-sm leading-relaxed font-medium">{animal?.description}</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-3">
                                {bids.length === 0 ? (
                                    <div className="py-20 flex flex-col items-center opacity-20">
                                        <span className="material-icons text-4xl mb-4">history</span>
                                        <p className="text-[10px] font-black uppercase tracking-widest">Aguardando Primeiro Lance</p>
                                    </div>
                                ) : (
                                    bids.map((bid, index) => (
                                        <div key={bid.id} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                                            index === 0 
                                            ? 'bg-[#ECA413]/5 border-[#ECA413]/20 shadow-lg shadow-[#ECA413]/5' 
                                            : 'bg-white/5 border-white/5'
                                        }`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                    index === 0 ? 'bg-[#ECA413] text-black' : 'bg-white/10 text-white/40'
                                                }`}>
                                                    <span className="material-icons text-sm">{index === 0 ? 'emoji_events' : 'person'}</span>
                                                </div>
                                                <div>
                                                    <p className="text-white text-xs font-black uppercase tracking-tight">
                                                        Usuário {bid.bidder_id.substring(0, 8)}***
                                                        {index === 0 && <span className="ml-2 text-[#ECA413] text-[8px] font-black tracking-widest">• LÍDER</span>}
                                                    </p>
                                                    <p className="text-white/20 text-[8px] font-bold uppercase mt-0.5">Há {Math.floor(Math.random() * 59 + 1)} min</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-lg font-black tracking-tighter ${index === 0 ? 'text-[#ECA413]' : 'text-white/60'}`}>{formatCurrency(bid.amount)}</p>
                                                {index === 0 && <p className="text-green-500 text-[7px] font-black uppercase tracking-widest">+ {formatCurrency(bid.amount - (bid.previous_amount || 0))}</p>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sticky Action Bar (Mobile) */}
            {!isFinished && (
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#0F0A05]/80 backdrop-blur-2xl border-t border-white/10 z-40 sm:hidden">
                    <button 
                        onClick={() => setShowBidModal(true)}
                        className="w-full h-16 bg-[#ECA413] text-black rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        <span className="material-icons">gavel</span>
                        Dar Lance • {formatCurrency(auction.current_bid ? auction.current_bid + auction.minimum_increment : auction.starting_bid)}
                    </button>
                </div>
            )}

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

const DetailItem: React.FC<{ label: string; value?: string | number }> = ({ label, value }) => (
    <div className="bg-white/5 p-5 rounded-3xl border border-white/5 group hover:border-[#ECA413]/20 transition-colors">
        <p className="text-white/20 text-[8px] uppercase font-black tracking-widest mb-1.5">{label}</p>
        <p className="text-white text-sm font-black tracking-tight">{value || '---'}</p>
    </div>
);

export default AuctionDetail;
