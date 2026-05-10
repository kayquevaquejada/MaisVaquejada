import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { User } from '../../types';
import { AuctionUser } from '../types';

interface AdminPanelProps {
    user: User;
    auctionUser: AuctionUser;
    onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ user, auctionUser, onBack }) => {
    const [stats, setStats] = useState({
        pendingSellers: 0,
        pendingAnimals: 0,
        activeAuctions: 0
    });

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        const { count: sCount } = await supabase.from('auction_seller_applications').select('*', { count: 'exact', head: true }).eq('status', 'submitted');
        const { count: aCount } = await supabase.from('auction_animals').select('*', { count: 'exact', head: true }).eq('status', 'pending_review');
        const { count: lCount } = await supabase.from('auctions').select('*', { count: 'exact', head: true }).eq('status', 'active');
        
        setStats({
            pendingSellers: sCount || 0,
            pendingAnimals: aCount || 0,
            activeAuctions: lCount || 0
        });
    };

    return (
        <div className="min-h-screen bg-[#0F0A05] p-6">
            <div className="flex items-center gap-4 mb-8 pt-6">
                <button onClick={onBack} className="material-icons text-white/40">arrow_back</button>
                <h1 className="text-xl font-black uppercase tracking-tighter text-[#ECA413]">Gestão de Leilões</h1>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-8">
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex items-center justify-between">
                    <div>
                        <p className="text-white/20 text-[10px] uppercase font-black mb-1">Vendedores Pendentes</p>
                        <p className="text-white text-2xl font-black tracking-tighter">{stats.pendingSellers}</p>
                    </div>
                    <span className="material-icons text-[#ECA413]">people</span>
                </div>
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex items-center justify-between">
                    <div>
                        <p className="text-white/20 text-[10px] uppercase font-black mb-1">Animais p/ Análise</p>
                        <p className="text-white text-2xl font-black tracking-tighter">{stats.pendingAnimals}</p>
                    </div>
                    <span className="material-icons text-[#ECA413]">pets</span>
                </div>
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex items-center justify-between">
                    <div>
                        <p className="text-white/20 text-[10px] uppercase font-black mb-1">Leilões Ativos</p>
                        <p className="text-white text-2xl font-black tracking-tighter">{stats.activeAuctions}</p>
                    </div>
                    <span className="material-icons text-[#ECA413]">gavel</span>
                </div>
            </div>

            <div className="bg-white/5 rounded-3xl p-8 text-center border border-white/5">
                <span className="material-icons text-white/10 text-5xl mb-4">analytics</span>
                <h2 className="text-white/40 font-black uppercase text-sm tracking-widest mb-2">Painel Administrativo</h2>
                <p className="text-white/20 text-[10px] uppercase max-w-[200px] mx-auto leading-relaxed">Use este painel para aprovar vendedores, animais e gerenciar leilões em tempo real.</p>
            </div>
        </div>
    );
};

export default AdminPanel;
