import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { AuctionUser, Auction } from './types';
import { Preferences } from '@capacitor/preferences';
import AuctionHome from './views/AuctionHome';
import AuctionDetail from './views/AuctionDetail';
import SellerDashboard from './views/SellerDashboard';
import AdminPanel from './views/AdminPanel';
import SellerApplication from './views/SellerApplication';

interface AuctionModuleProps {
    user: User | null;
    onBack: () => void;
}

type SubView = 'HOME' | 'DETAIL' | 'SELLER_DASHBOARD' | 'ADMIN_PANEL' | 'APPLY_SELLER';

const AuctionModule: React.FC<AuctionModuleProps> = ({ user, onBack }) => {
    const [subView, setSubView] = useState<SubView>('HOME');
    const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(null);
    const [auctionUser, setAuctionUser] = useState<AuctionUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [approvalBanner, setApprovalBanner] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        // Restore persisted state
        const restoreState = async () => {
            try {
                const { value: lastView } = await Preferences.get({ key: `auction_last_subview_${user.id}` });
                const { value: lastId } = await Preferences.get({ key: `auction_selected_id_${user.id}` });
                
                if (lastView) setSubView(lastView as SubView);
                if (lastId) setSelectedAuctionId(lastId);
            } catch (e) {
                console.warn('Failed to restore auction state:', e);
            }
        };

        restoreState();
        fetchAuctionUser();

        // ── Realtime: escuta mudanças no registro deste usuário em auction_users ──
        // Quando o admin aprova/rejeita, o painel do vendedor atualiza instantaneamente
        const channel = supabase
            .channel(`auction_user_${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'auction_users',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const updated = payload.new as AuctionUser;
                    setAuctionUser(updated);

                    if (updated.auction_role === 'seller_approved') {
                        setApprovalBanner('Sua conta de vendedor foi aprovada! Você já pode criar leilões.');
                        setTimeout(() => setApprovalBanner(null), 6000);
                    } else if (updated.auction_role === 'user') {
                        setApprovalBanner('Sua solicitação foi recusada. Verifique sua notificação para mais detalhes.');
                        setTimeout(() => setApprovalBanner(null), 8000);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const fetchAuctionUser = async () => {
        try {
            const { data, error } = await supabase
                .from('auction_users')
                .select('*')
                .eq('user_id', user!.id)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                const isAdmin = user!.role === 'ADMIN' || user!.role === 'ADMIN_MASTER' || (user as any).isMaster;
                const { data: newData, error: insertError } = await supabase
                    .from('auction_users')
                    .insert([{ user_id: user!.id, auction_role: isAdmin ? 'admin' : 'user' }])
                    .select('*')
                    .single();

                if (insertError) throw insertError;
                setAuctionUser(newData);
            } else {
                const isAdmin = user!.role === 'ADMIN' || user!.role === 'ADMIN_MASTER' || (user as any).isMaster;
                if (isAdmin && data.auction_role !== 'admin') {
                    await supabase.from('auction_users')
                        .update({ auction_role: 'admin' })
                        .eq('user_id', user!.id);
                    setAuctionUser({ ...data, auction_role: 'admin' });
                } else {
                    setAuctionUser(data);
                }
            }
        } catch (err) {
            console.error('Error fetching auction user:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleViewAuction = (id: string) => {
        setSelectedAuctionId(id);
        setSubView('DETAIL');
        if (user) {
            Preferences.set({ key: `auction_last_subview_${user.id}`, value: 'DETAIL' });
            Preferences.set({ key: `auction_selected_id_${user.id}`, value: id });
        }
    };

    const handleSetSubView = (view: SubView) => {
        setSubView(view);
        if (user) {
            Preferences.set({ key: `auction_last_subview_${user.id}`, value: view });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0F0A05] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#ECA413]/20 border-t-[#ECA413] rounded-full animate-spin" />
            </div>
        );
    }

    const renderContent = () => {
        switch (subView) {
            case 'HOME':
                return (
                    <AuctionHome
                        user={user}
                        auctionUser={auctionUser}
                        onViewAuction={handleViewAuction}
                        onApplySeller={() => handleSetSubView('APPLY_SELLER')}
                        onSellerDashboard={() => handleSetSubView('SELLER_DASHBOARD')}
                        onAdminPanel={() => handleSetSubView('ADMIN_PANEL')}
                        onRefreshUser={fetchAuctionUser}
                        onBack={onBack}
                    />
                );
            case 'DETAIL':
                return selectedAuctionId ? (
                    <AuctionDetail
                        id={selectedAuctionId}
                        user={user}
                        auctionUser={auctionUser}
                        onBack={() => handleSetSubView('HOME')}
                    />
                ) : null;
            case 'SELLER_DASHBOARD':
                return (
                    <SellerDashboard
                        user={user!}
                        auctionUser={auctionUser!}
                        onBack={() => handleSetSubView('HOME')}
                    />
                );
            case 'ADMIN_PANEL':
                return (
                    <AdminPanel
                        user={user!}
                        auctionUser={auctionUser!}
                        onBack={() => setSubView('HOME')}
                    />
                );
            case 'APPLY_SELLER':
                return (
                    <SellerApplication
                        user={user!}
                        onBack={() => setSubView('HOME')}
                        onSuccess={() => {
                            fetchAuctionUser();
                            setSubView('HOME');
                        }}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-[#0F0A05] text-white font-display relative">

            {/* Banner de aprovação em tempo real */}
            {approvalBanner && (
                <div className="fixed top-0 left-0 right-0 z-[200] animate-in slide-in-from-top duration-500 pointer-events-none">
                    <div className="mx-4 mt-6 bg-[#ECA413] text-black px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-[#ECA413]/40 flex items-center gap-3">
                        <span className="material-icons text-lg shrink-0">verified</span>
                        <span>{approvalBanner}</span>
                    </div>
                </div>
            )}

            {renderContent()}
        </div>
    );
};

export default AuctionModule;
