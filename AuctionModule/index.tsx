import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { Auction, AuctionUser, AuctionRole } from './types';
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

    useEffect(() => {
        if (user) {
            fetchAuctionUser();
        } else {
            setLoading(false);
        }
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
                // Initialize auction user if doesn't exist
                const { data: newData, error: insertError } = await supabase
                    .from('auction_users')
                    .insert([{ user_id: user!.id, auction_role: user!.role === 'ADMIN' ? 'admin' : 'user' }])
                    .select('*')
                    .single();
                
                if (insertError) throw insertError;
                setAuctionUser(newData);
            } else {
                setAuctionUser(data);
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
                        onApplySeller={() => setSubView('APPLY_SELLER')}
                        onSellerDashboard={() => setSubView('SELLER_DASHBOARD')}
                        onAdminPanel={() => setSubView('ADMIN_PANEL')}
                        onBack={onBack}
                    />
                );
            case 'DETAIL':
                return selectedAuctionId ? (
                    <AuctionDetail 
                        id={selectedAuctionId} 
                        user={user} 
                        auctionUser={auctionUser} 
                        onBack={() => setSubView('HOME')} 
                    />
                ) : null;
            case 'SELLER_DASHBOARD':
                return (
                    <SellerDashboard 
                        user={user!} 
                        auctionUser={auctionUser!} 
                        onBack={() => setSubView('HOME')} 
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
        <div className="min-h-screen bg-[#0F0A05] text-white font-display">
            {renderContent()}
        </div>
    );
};

export default AuctionModule;
