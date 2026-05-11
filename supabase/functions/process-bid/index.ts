import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const { auctionId, amount } = await req.json();

    // 1. Get Auction Details (including previous bidder and seller)
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('*, animal:auction_animals(*)')
      .eq('id', auctionId)
      .single();

    if (auctionError || !auction) {
      throw new Error('Leilão não encontrado');
    }

    // 2. Check if active
    if (auction.status !== 'active') {
      throw new Error('Este leilão não está ativo');
    }

    // 3. Check expiration
    if (new Date(auction.end_at) < new Date()) {
      throw new Error('Este leilão já encerrou');
    }

    // 4. Check if seller is the bidder
    if (auction.animal.seller_id === user.id) {
      throw new Error('Você não pode dar lances no seu próprio animal');
    }

    // 5. Validate Bid Amount
    const currentBid = auction.current_bid || auction.starting_bid;
    const minIncrement = auction.minimum_increment || 100;

    if (amount < currentBid + minIncrement) {
      throw new Error(`Lance mínimo é R$ ${(currentBid + minIncrement).toLocaleString('pt-BR')}`);
    }

    // 6. Record Previous Bidder for Notification
    const previousBidderId = auction.bidder_id;
    const previousAmount = auction.current_bid;

    // 7. Insert Bid and Update Auction
    const { data: bid, error: bidError } = await supabase
      .from('auction_bids')
      .insert({
        auction_id: auctionId,
        bidder_id: user.id,
        amount: amount,
        previous_amount: previousAmount || 0
      })
      .select()
      .single();

    if (bidError) throw bidError;

    const { error: updateError } = await supabase
      .from('auctions')
      .update({ 
        current_bid: amount,
        bidder_id: user.id,
        bids_count: (auction.bids_count || 0) + 1
      })
      .eq('id', auctionId);

    if (updateError) throw updateError;

    // 8. Notifications
    const notifications = [];

    // Notify Seller
    notifications.push({
      user_id: auction.animal.seller_id,
      actor_id: user.id,
      type: 'auction_bid',
      title: 'Novo Lance Recebido!',
      message: `Seu animal ${auction.animal.name} recebeu um lance de R$ ${amount.toLocaleString('pt-BR')}`,
      reference_id: auctionId,
      metadata: { auction_id: auctionId, amount }
    });

    // Notify Previous Bidder (if any and not the same user)
    if (previousBidderId && previousBidderId !== user.id) {
      notifications.push({
        user_id: previousBidderId,
        actor_id: user.id,
        type: 'auction_outbid',
        title: 'Você foi superado!',
        message: `Superaram seu lance no animal ${auction.animal.name}. Novo valor: R$ ${amount.toLocaleString('pt-BR')}`,
        reference_id: auctionId,
        metadata: { auction_id: auctionId, amount }
      });
    }

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    // 9. Log action
    await supabase.from('auction_logs').insert({
      user_id: user.id,
      auction_id: auctionId,
      action: 'place_bid',
      metadata: { amount, bid_id: bid.id }
    });

    return new Response(JSON.stringify({ success: true, bid }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
