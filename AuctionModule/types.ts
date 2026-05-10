export type AuctionRole = 'guest' | 'user' | 'verified_user' | 'seller_pending' | 'seller_approved' | 'haras_verified' | 'admin';

export type AuctionAccessStatus = 'not_requested' | 'pending_review' | 'approved' | 'rejected' | 'suspended';

export type AuctionStatus = 'draft' | 'pending_review' | 'approved' | 'scheduled' | 'active' | 'paused' | 'closed' | 'cancelled' | 'under_dispute';

export type AnimalStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'suspended';

export type BidStatus = 'valid' | 'outbid' | 'winner' | 'cancelled_by_admin' | 'invalid';

export interface AuctionUser {
    id: string;
    user_id: string;
    auction_role: AuctionRole;
    can_bid: boolean;
    can_sell: boolean;
    is_suspended: boolean;
    phone_verified: boolean;
    document_verified: boolean;
    created_at: string;
    updated_at: string;
}

export interface AuctionAnimal {
    id: string;
    seller_id: string;
    name: string;
    type: string;
    breed: string;
    sex: 'male' | 'female';
    age: string;
    coat?: string;
    height?: string;
    weight?: string;
    registration_number?: string;
    pedigree?: string;
    city: string;
    state: string;
    description: string;
    main_image_url: string;
    gallery_image_urls: string[];
    video_urls: string[];
    document_urls: string[];
    status: AnimalStatus;
    rejection_reason?: string;
    created_at: string;
    updated_at: string;
    seller?: {
        name: string;
        username: string;
        avatar_url: string;
    };
}

export interface Auction {
    id: string;
    animal_id: string;
    seller_id: string;
    title: string;
    description?: string;
    starting_bid: number;
    current_bid: number;
    current_winner_id?: string;
    minimum_increment: number;
    start_at: string;
    end_at: string;
    status: AuctionStatus;
    platform_commission_percentage: number;
    final_sale_value?: number;
    sale_status: string;
    contact_release_status: string;
    created_at: string;
    updated_at: string;
    animal?: AuctionAnimal;
}

export interface Bid {
    id: string;
    auction_id: string;
    bidder_id: string;
    amount: number;
    previous_amount?: number;
    status: BidStatus;
    created_at: string;
    bidder?: {
        name: string;
        username: string;
        avatar_url: string;
    };
}
