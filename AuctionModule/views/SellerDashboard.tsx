import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { AuctionUser, Auction, AuctionAnimal } from '../types';
import { useAuction } from '../hooks/useAuction';
import CreateAuctionFlow from '../components/CreateAuctionFlow';

interface SellerDashboardProps {
    user: User;
    auctionUser: AuctionUser;
    onBack: () => void;
}

const SellerDashboard: React.FC<SellerDashboardProps> = ({ user, auctionUser, onBack }) => {
    const { fetchMyAnimals, fetchMyAuctions } = useAuction();
    const [loading, setLoading] = useState(true);
    const [myAnimals, setMyAnimals] = useState<AuctionAnimal[]>([]);
    const [myAuctions, setMyAuctions] = useState<Auction[]>([]);
    const [showCreateFlow, setShowCreateFlow] = useState(false);
    const [activeTab, setActiveTab] = useState<'animals' | 'auctions'>('animals');

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        setLoading(true);
        const [animals, auctions] = await Promise.all([
            fetchMyAnimals(user.id),
            fetchMyAuctions(user.id)
        ]);
        setMyAnimals(animals);
        setMyAuctions(auctions);
        setLoading(false);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'text-green-500 bg-green-500/10 border-green-500/20';
            case 'pending_review': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            case 'scheduled': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
            case 'rejected': return 'text-red-500 bg-red-500/10 border-red-500/20';
            default: return 'text-white/40 bg-white/5 border-white/10';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'Ao Vivo';
            case 'pending_review': return 'Em Análise';
            case 'scheduled': return 'Agendado';
            case 'rejected': return 'Recusado';
            case 'closed': return 'Encerrado';
            default: return status.toUpperCase();
        }
    };

    if (loading && !myAnimals.length) {
        return (
            <div className="min-h-screen bg-[#0F0A05] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#ECA413]/20 border-t-[#ECA413] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0F0A05] pb-32">
            {/* Header */}
            <div className="px-6 pt-12 pb-8 flex flex-col gap-6 sticky top-0 bg-[#0F0A05]/90 backdrop-blur-xl z-50 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 active:scale-90 transition-all">
                            <span className="material-icons">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-tighter text-white">Painel Operacional</h1>
                            <p className="text-[#ECA413] text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                                {user.name} • Vendedor Verificado
                                <span className="material-icons text-[10px]">verified</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#ECA413] border border-white/5 relative">
                            <span className="material-icons text-xl">notifications</span>
                            <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-600 rounded-full border border-black" />
                        </button>
                    </div>
                </div>

                {/* Main Metrics */}
                <div className="grid grid-cols-3 gap-3">
                    <MetricCard label="Animais" value={myAnimals.length} icon="🐎" />
                    <MetricCard label="Ativos" value={myAuctions.filter(a => a.status === 'active').length} icon="🔥" />
                    <MetricCard label="Vendas" value={myAuctions.filter(a => a.status === 'closed').length} icon="🏆" color="#ECA413" />
                </div>
            </div>

            <div className="px-6 mt-8">
                {/* Creation Call-to-Action */}
                <button 
                    onClick={() => setShowCreateFlow(true)}
                    className="w-full py-6 bg-gradient-to-br from-[#ECA413] to-[#1A1108] rounded-[32px] border border-[#ECA413]/20 shadow-2xl shadow-[#ECA413]/10 flex flex-col items-center justify-center gap-3 active:scale-[0.98] transition-all group mb-10 overflow-hidden relative"
                >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-10" />
                    <div className="w-14 h-14 bg-black/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span className="material-icons text-white text-3xl">add</span>
                    </div>
                    <div className="text-center relative z-10">
                        <p className="text-black font-black uppercase tracking-[0.2em] text-sm">Cadastrar Novo Animal</p>
                        <p className="text-black/40 text-[9px] font-black uppercase tracking-widest mt-1">Siga o fluxo em 4 etapas rápidas</p>
                    </div>
                </button>

                {/* Tabs */}
                <div className="flex gap-8 border-b border-white/5 mb-8 overflow-x-auto hide-scrollbar">
                    <button 
                        onClick={() => setActiveTab('animals')}
                        className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'animals' ? 'text-[#ECA413]' : 'text-white/20'}`}
                    >
                        Meus Animais ({myAnimals.length})
                        {activeTab === 'animals' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ECA413] rounded-full" />}
                    </button>
                    <button 
                        onClick={() => setActiveTab('auctions')}
                        className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'auctions' ? 'text-[#ECA413]' : 'text-white/20'}`}
                    >
                        Meus Leilões ({myAuctions.length})
                        {activeTab === 'auctions' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ECA413] rounded-full" />}
                    </button>
                </div>

                {/* List Content */}
                <div className="space-y-4">
                    {activeTab === 'animals' ? (
                        myAnimals.length === 0 ? (
                            <div className="py-20 flex flex-col items-center text-center opacity-20">
                                <span className="material-icons text-4xl mb-4">inventory_2</span>
                                <p className="text-[10px] font-black uppercase tracking-widest">Nenhum animal cadastrado</p>
                            </div>
                        ) : (
                            myAnimals.map(animal => (
                                <div key={animal.id} className="bg-[#1A1108] p-5 rounded-3xl border border-white/5 flex items-center gap-5 group active:scale-[0.98] transition-all">
                                    <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-lg">
                                        <img src={animal.main_image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-white text-sm font-black uppercase tracking-tight">{animal.name}</p>
                                            <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-md border ${getStatusColor(animal.status)}`}>
                                                {getStatusLabel(animal.status)}
                                            </span>
                                        </div>
                                        <p className="text-white/20 text-[9px] font-black uppercase tracking-widest">{animal.breed} • {animal.age}</p>
                                    </div>
                                    <button className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
                                        <span className="material-icons text-xl">more_vert</span>
                                    </button>
                                </div>
                            ))
                        )
                    ) : (
                        myAuctions.length === 0 ? (
                            <div className="py-20 flex flex-col items-center text-center opacity-20">
                                <span className="material-icons text-4xl mb-4">gavel</span>
                                <p className="text-[10px] font-black uppercase tracking-widest">Nenhum leilão configurado</p>
                            </div>
                        ) : (
                            myAuctions.map(auction => (
                                <div key={auction.id} className="bg-[#1A1108] p-5 rounded-3xl border border-white/5 flex flex-col gap-4 active:scale-[0.98] transition-all">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-white/10">
                                            <img src={auction.animal?.main_image_url} className="w-full h-full object-cover" alt="" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-white text-sm font-black uppercase tracking-tight">{auction.animal?.name}</p>
                                                <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-md border ${getStatusColor(auction.status)}`}>
                                                    {getStatusLabel(auction.status)}
                                                </span>
                                            </div>
                                            <p className="text-[#ECA413] text-[10px] font-black tracking-tighter">Lance: {formatCurrency(auction.current_bid || auction.starting_bid)}</p>
                                        </div>
                                    </div>
                                    {auction.status === 'rejected' && auction.animal?.rejection_reason && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                            <p className="text-red-500 text-[8px] font-black uppercase tracking-tight">Motivo: {auction.animal.rejection_reason}</p>
                                        </div>
                                    )}
                                </div>
                            ))
                        )
                    )}
                </div>
            </div>

            {/* Creation Flow Overlay */}
            {showCreateFlow && (
                <CreateAuctionFlow 
                    user={user} 
                    onClose={() => setShowCreateFlow(false)} 
                    onSuccess={() => {
                        setShowCreateFlow(false);
                        loadData();
                    }} 
                />
            )}
        </div>
    );
};

const MetricCard: React.FC<{ label: string; value: number; icon: string; color?: string }> = ({ label, value, icon, color = 'white' }) => (
    <div className="bg-white/5 p-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center">
        <span className="text-xl mb-1">{icon}</span>
        <p className="text-2xl font-black tracking-tighter leading-none mb-1" style={{ color }}>{value}</p>
        <p className="text-white/20 text-[8px] font-black uppercase tracking-widest">{label}</p>
    </div>
);

export default SellerDashboard;
