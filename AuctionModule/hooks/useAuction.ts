import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Auction, AuctionAnimal, Bid } from '../types';

export const useAuction = () => {
    const [auctions, setAuctions] = useState<Auction[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchActiveAuctions = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('auctions')
                .select('*, animal:auction_animals(*)')
                .in('status', ['active', 'scheduled'])
                .order('end_at', { ascending: true });

            if (error) throw error;
            setAuctions(data || []);
        } catch (err) {
            console.error('Error fetching auctions:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMyAnimals = async (sellerId: string) => {
        try {
            const { data, error } = await supabase
                .from('auction_animals')
                .select('*')
                .eq('seller_id', sellerId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as AuctionAnimal[];
        } catch (err) {
            console.error('Error fetching my animals:', err);
            return [];
        }
    };

    const fetchMyAuctions = async (sellerId: string) => {
        try {
            const { data, error } = await supabase
                .from('auctions')
                .select('*, animal:auction_animals(*)')
                .eq('seller_id', sellerId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as Auction[];
        } catch (err) {
            console.error('Error fetching my auctions:', err);
            return [];
        }
    };

    const getAuctionDetails = async (id: string) => {
        try {
            const { data, error } = await supabase
                .from('auctions')
                .select('*, animal:auction_animals(*)')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as Auction;
        } catch (err) {
            console.error('Error fetching auction details:', err);
            return null;
        }
    };

    const getAuctionBids = async (auctionId: string) => {
        try {
            const { data, error } = await supabase
                .from('auction_bids')
                .select('*')
                .eq('auction_id', auctionId)
                .order('amount', { ascending: false });

            if (error) throw error;
            return data as Bid[];
        } catch (err) {
            console.error('Error fetching bids:', err);
            return [];
        }
    };

    const placeBid = async (auctionId: string, amount: number) => {
        try {
            const { data, error } = await supabase.functions.invoke('process-bid', {
                body: { auctionId, amount }
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            return { success: true, bid: data.bid };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const createAnimal = async (animal: Partial<AuctionAnimal>) => {
        try {
            const { data, error } = await supabase
                .from('auction_animals')
                .insert([animal])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const createAuction = async (auction: Partial<Auction>) => {
        try {
            const { data, error } = await supabase
                .from('auctions')
                .insert([{
                    ...auction,
                    status: 'pending_review'
                }])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    useEffect(() => {
        fetchActiveAuctions();
    }, []);

    return {
        auctions,
        loading,
        fetchActiveAuctions,
        fetchMyAnimals,
        fetchMyAuctions,
        getAuctionDetails,
        getAuctionBids,
        placeBid,
        createAnimal,
        createAuction
    };
};
