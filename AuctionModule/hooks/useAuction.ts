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

    const placeBid = async (auctionId: string, userId: string, amount: number, previousAmount: number) => {
        try {
            // Transaction-like logic check on server side would be better, but for MVP:
            const { data: latestAuction } = await supabase
                .from('auctions')
                .select('current_bid, status, end_at')
                .eq('id', auctionId)
                .single();

            if (!latestAuction || latestAuction.status !== 'active') {
                throw new Error('Leilão não está ativo.');
            }

            if (new Date(latestAuction.end_at) < new Date()) {
                throw new Error('Leilão já encerrado.');
            }

            if (amount <= latestAuction.current_bid) {
                throw new Error('O lance deve ser maior que o atual.');
            }

            const { data: bid, error: bidError } = await supabase
                .from('auction_bids')
                .insert([{
                    auction_id: auctionId,
                    bidder_id: userId,
                    amount,
                    previous_amount: previousAmount,
                    status: 'valid'
                }])
                .select()
                .single();

            if (bidError) throw bidError;

            // Update auction current bid
            const { error: updateError } = await supabase
                .from('auctions')
                .update({ 
                    current_bid: amount, 
                    current_winner_id: userId 
                })
                .eq('id', auctionId);

            if (updateError) throw updateError;

            return { success: true, bid };
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
        getAuctionDetails,
        getAuctionBids,
        placeBid
    };
};
