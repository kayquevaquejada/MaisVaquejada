export type InternalAdStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'expired'
  | 'archived'
  | 'rejected';

export type InternalAdPlacement =
  | 'social_feed_native'
  | 'story_sponsored'
  | 'feed_top_highlight'
  | 'dm_sponsored_slot'
  | 'profile_highlight_ad'
  | 'fullscreen_campaign'
  | 'explore_sponsored'
  | 'event_sponsored_card'
  | 'video_call_waiting';

export type InternalAdActionType =
  | 'open_internal_route'
  | 'open_profile'
  | 'open_external_link'
  | 'open_whatsapp'
  | 'open_phone';

export type InternalAdContractType =
  | 'period'
  | 'impressions'
  | 'clicks'
  | 'premium'
  | 'institutional'
  | 'strategic_partner';

export interface InternalAdCampaign {
  id: string;
  internal_name: string;
  public_title: string;
  advertiser_name: string;
  advertiser_logo_url?: string;
  description?: string;
  cta_text: string;
  main_media_url: string;
  media_type: 'image' | 'video';
  action_type: InternalAdActionType;
  action_value: string;
  fallback_action_type?: InternalAdActionType;
  fallback_action_value?: string;
  placement: InternalAdPlacement;
  status: InternalAdStatus;
  priority: number;
  weight: number;
  contract_type: InternalAdContractType;
  budget_amount?: number;
  impression_goal?: number;
  click_goal?: number;
  max_impressions?: number;
  max_clicks?: number;
  start_at?: string;
  end_at?: string;
  is_premium: boolean;
  requires_approval: boolean;
  approved_by?: string;
  approved_at?: string;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  notes_internal?: string;
  target_rules_json?: Record<string, any>;
  frequency_rules_json?: Record<string, any>;
}

export interface InternalAdImpression {
  id: string;
  campaign_id: string;
  user_id?: string;
  placement: InternalAdPlacement;
  feed_position?: number;
  session_id?: string;
  seen_at: string;
  metadata_json?: Record<string, any>;
}

export interface InternalAdClick {
  id: string;
  campaign_id: string;
  user_id?: string;
  placement: InternalAdPlacement;
  clicked_at: string;
  action_type: InternalAdActionType;
  session_id?: string;
  metadata_json?: Record<string, any>;
}
