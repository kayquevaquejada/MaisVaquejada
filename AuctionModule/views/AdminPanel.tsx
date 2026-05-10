import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { User } from '../../types';
import { AuctionUser } from '../types';
import { createNotification } from '../../lib/notifications';

interface AdminPanelProps {
    user: User;
    auctionUser: AuctionUser;
    onBack: () => void;
}

type AdminSubView = 'OVERVIEW' | 'SELLERS' | 'ANIMALS' | 'AUCTIONS';

const AdminPanel: React.FC<AdminPanelProps> = ({ user, auctionUser, onBack }) => {
    const [subView, setSubView] = useState<AdminSubView>('OVERVIEW');
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        pendingSellers: 0,
        pendingAnimals: 0,
        activeAuctions: 0
    });
    const [isModuleHidden, setIsModuleHidden] = useState(false);

    const [pendingSellers, setPendingSellers] = useState<any[]>([]);
    const [pendingAnimals, setPendingAnimals] = useState<any[]>([]);
    useEffect(() => {
        fetchStats();
        fetchHiddenStatus();
        if (subView === 'SELLERS') fetchPendingSellers();
        if (subView === 'ANIMALS') fetchPendingAnimals();
    }, [subView]);

    const fetchHiddenStatus = async () => {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'auction_module_hidden').single();
        if (data?.value) setIsModuleHidden(!!data.value.enabled);
    };

    const toggleModuleVisibility = async () => {
        const newValue = !isModuleHidden;
        const { error } = await supabase.from('app_settings')
            .update({ value: { enabled: newValue } })
            .eq('key', 'auction_module_hidden');
        
        if (!error) {
            setIsModuleHidden(newValue);
            alert(`Módulo ${newValue ? 'OCULTADO' : 'VISÍVEL'} para usuários.`);
        }
    };

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

    const fetchPendingSellers = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('auction_seller_applications')
            .select('*')
            .eq('status', 'submitted')
            .order('created_at', { ascending: false });
        setPendingSellers(data || []);
        setLoading(false);
    };

    const fetchPendingAnimals = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('auction_animals')
            .select('*')
            .eq('status', 'pending_review')
            .order('created_at', { ascending: false });
        setPendingAnimals(data || []);
        setLoading(false);
    };

    const handleApproveSeller = async (applicationId: string, applicantUserId: string) => {
        if (!confirm('Aprovar este vendedor?')) return;
        setLoading(true);
        try {
            await supabase.from('auction_seller_applications').update({ status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq('id', applicationId);
            
            // Upsert user role to approved
            await supabase.from('auction_users').upsert({ 
                user_id: applicantUserId, 
                auction_role: 'seller_approved', 
                can_sell: true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

            // Create notification for the user
            await createNotification({
                user_id: applicantUserId,
                actor_id: user.id,
                type: 'system',
                message: 'Sua solicitação para ser vendedor em leilões foi aprovada! Agora você já pode cadastrar seus animais.',
                metadata: { action: 'seller_approved' }
            });

            fetchPendingSellers();
            fetchStats();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveAnimal = async (animalId: string) => {
        if (!confirm('Aprovar este animal para leilão?')) return;
        setLoading(true);
        try {
            const { data: animal } = await supabase.from('auction_animals').update({ status: 'approved' }).eq('id', animalId).select('seller_id, name').single();
            
            if (animal) {
                // Create notification for the seller
                await createNotification({
                    user_id: animal.seller_id,
                    actor_id: user.id,
                    type: 'system',
                    message: `Seu animal "${animal.name}" foi aprovado para leilão e logo estará disponível para lances.`,
                    metadata: { action: 'animal_approved', animal_id: animalId }
                });
            }

            fetchPendingAnimals();
            fetchStats();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const renderOverview = () => (
        <>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 mb-6 flex items-center justify-between">
                <div>
                    <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">Modo Desenvolvimento</p>
                    <p className="text-white/20 text-[8px] uppercase">Ocultar módulo para usuários comuns</p>
                </div>
                <button 
                    onClick={toggleModuleVisibility}
                    className={`w-14 h-8 rounded-full relative transition-all duration-300 ${isModuleHidden ? 'bg-[#ECA413]' : 'bg-white/10'}`}
                >
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg transition-all duration-300 ${isModuleHidden ? 'left-7' : 'left-1'}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-8">
                <button 
                    onClick={() => setSubView('SELLERS')}
                    className="bg-white/5 p-6 rounded-3xl border border-white/5 flex items-center justify-between active:scale-[0.98] transition-all"
                >
                    <div className="text-left">
                        <p className="text-white/20 text-[10px] uppercase font-black mb-1">Vendedores Pendentes</p>
                        <p className="text-white text-2xl font-black tracking-tighter">{stats.pendingSellers}</p>
                    </div>
                    <span className="material-icons text-[#ECA413]">people</span>
                </button>
                <button 
                    onClick={() => setSubView('ANIMALS')}
                    className="bg-white/5 p-6 rounded-3xl border border-white/5 flex items-center justify-between active:scale-[0.98] transition-all"
                >
                    <div className="text-left">
                        <p className="text-white/20 text-[10px] uppercase font-black mb-1">Animais p/ Análise</p>
                        <p className="text-white text-2xl font-black tracking-tighter">{stats.pendingAnimals}</p>
                    </div>
                    <span className="material-icons text-[#ECA413]">pets</span>
                </button>
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
        </>
    );

    const renderSellers = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-black uppercase text-sm tracking-widest">Solicitações de Vendedores</h2>
                <button onClick={() => setSubView('OVERVIEW')} className="text-[#ECA413] text-[10px] font-black uppercase">Voltar</button>
            </div>
            
            {loading ? (
                <div className="py-10 flex justify-center"><div className="w-8 h-8 border-4 border-[#ECA413]/20 border-t-[#ECA413] rounded-full animate-spin" /></div>
            ) : pendingSellers.length === 0 ? (
                <div className="py-20 text-center text-white/20 uppercase font-black text-xs">Nenhuma solicitação pendente</div>
            ) : (
                pendingSellers.map(seller => (
                    <div key={seller.id} className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-white font-black uppercase tracking-tighter text-lg">{seller.full_name}</p>
                                <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">{seller.farm_name || 'Individual'} • {seller.city}/{seller.state}</p>
                            </div>
                            <span className="bg-[#ECA413]/10 text-[#ECA413] text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest">Novo</span>
                        </div>
                        <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                            <p className="text-white/60 text-[10px] leading-relaxed italic">"{seller.experience_description || 'Sem descrição fornecida.'}"</p>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button 
                                onClick={() => handleApproveSeller(seller.id, seller.user_id)}
                                className="flex-1 h-12 bg-[#ECA413] text-black rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
                            >
                                Aprovar Vendedor
                            </button>
                            <button className="flex-1 h-12 bg-white/5 text-white/40 rounded-xl font-black uppercase text-[10px] tracking-widest border border-white/5">Rejeitar</button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    const renderAnimals = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-black uppercase text-sm tracking-widest">Animais para Análise</h2>
                <button onClick={() => setSubView('OVERVIEW')} className="text-[#ECA413] text-[10px] font-black uppercase">Voltar</button>
            </div>
            
            {loading ? (
                <div className="py-10 flex justify-center"><div className="w-8 h-8 border-4 border-[#ECA413]/20 border-t-[#ECA413] rounded-full animate-spin" /></div>
            ) : pendingAnimals.length === 0 ? (
                <div className="py-20 text-center text-white/20 uppercase font-black text-xs">Nenhum animal pendente</div>
            ) : (
                pendingAnimals.map(animal => (
                    <div key={animal.id} className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
                        <div className="flex gap-4">
                            <img src={animal.main_image_url} className="w-20 h-20 rounded-2xl object-cover border border-white/10" alt="" />
                            <div>
                                <p className="text-white font-black uppercase tracking-tighter text-lg">{animal.name}</p>
                                <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">{animal.breed} • {animal.sex === 'male' ? 'Macho' : 'Fêmea'}</p>
                                <p className="text-white/20 text-[8px] uppercase font-bold mt-1">{animal.city}/{animal.state}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button 
                                onClick={() => handleApproveAnimal(animal.id)}
                                className="flex-1 h-12 bg-[#ECA413] text-black rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
                            >
                                Aprovar Animal
                            </button>
                            <button className="flex-1 h-12 bg-white/5 text-white/40 rounded-xl font-black uppercase text-[10px] tracking-widest border border-white/5">Ver Detalhes</button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0F0A05] p-6 pb-20">
            <div className="flex items-center gap-4 mb-8 pt-6">
                <button onClick={onBack} className="material-icons text-white/40">arrow_back</button>
                <h1 className="text-xl font-black uppercase tracking-tighter text-[#ECA413]">Gestão de Leilões</h1>
            </div>

            {subView === 'OVERVIEW' && renderOverview()}
            {subView === 'SELLERS' && renderSellers()}
            {subView === 'ANIMALS' && renderAnimals()}
        </div>
    );
};

export default AdminPanel;
