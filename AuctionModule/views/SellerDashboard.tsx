import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { User } from '../../types';
import { AuctionUser, Auction, AuctionAnimal } from '../types';

interface SellerDashboardProps {
    user: User;
    auctionUser: AuctionUser;
    onBack: () => void;
}

const SellerDashboard: React.FC<SellerDashboardProps> = ({ user, auctionUser, onBack }) => {
    const [loading, setLoading] = useState(true);
    const [myAnimals, setMyAnimals] = useState<AuctionAnimal[]>([]);
    const [myAuctions, setMyAuctions] = useState<Auction[]>([]);

    useEffect(() => {
        fetchData();
    }, [user.id]);

    const fetchData = async () => {
        try {
            const { data: animals } = await supabase
                .from('auction_animals')
                .select('*')
                .eq('seller_id', user.id);
            
            const { data: auctions } = await supabase
                .from('auctions')
                .select('*, animal:auction_animals(*)')
                .eq('seller_id', user.id);

            setMyAnimals(animals || []);
            setMyAuctions(auctions || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0F0A05] p-6">
            <div className="flex items-center gap-4 mb-8 pt-6">
                <button onClick={onBack} className="material-icons text-white/40">arrow_back</button>
                <h1 className="text-xl font-black uppercase tracking-tighter text-[#ECA413]">Painel do Vendedor</h1>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                    <p className="text-white/20 text-[10px] uppercase font-black mb-1">Meus Animais</p>
                    <p className="text-white text-2xl font-black tracking-tighter">{myAnimals.length}</p>
                </div>
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                    <p className="text-white/20 text-[10px] uppercase font-black mb-1">Leilões Ativos</p>
                    <p className="text-white text-2xl font-black tracking-tighter">{myAuctions.filter(a => a.status === 'active').length}</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-white/40 text-[10px] font-black uppercase tracking-widest">Meus Animais</h2>
                    <button className="text-[#ECA413] text-[10px] font-black uppercase tracking-widest">+ Cadastrar</button>
                </div>

                <div className="space-y-4">
                    {myAnimals.length === 0 ? (
                        <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-3xl">
                            <p className="text-white/20 text-[10px] uppercase font-bold">Nenhum animal cadastrado</p>
                        </div>
                    ) : (
                        myAnimals.map(animal => (
                            <div key={animal.id} className="bg-white/5 p-4 rounded-2xl flex items-center gap-4 border border-white/5">
                                <img src={animal.main_image_url} className="w-16 h-16 rounded-xl object-cover" alt="" />
                                <div className="flex-1">
                                    <p className="text-white text-sm font-black uppercase tracking-tighter">{animal.name}</p>
                                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{animal.status}</p>
                                </div>
                                <span className="material-icons text-white/20">more_vert</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default SellerDashboard;
