import { supabase } from '../../lib/supabase';
import { InternalAdCampaign, InternalAdPlacement, InternalAdActionType } from '../types/ads';

export class InternalAdsService {
  /**
   * Fetches active and valid campaigns for a specific placement based on current time and status.
   */
  static async getEligibleCampaigns(placement: InternalAdPlacement): Promise<InternalAdCampaign[]> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('internal_ad_campaigns')
        .select('*')
        .eq('status', 'active')
        .eq('placement', placement)
        .gte('end_at', now)
        .lte('start_at', now)
        .order('priority', { ascending: false });

      if (error) {
        console.warn('Error fetching eligible campaigns:', error);
        return [];
      }

      return data as InternalAdCampaign[];
    } catch (err) {
      console.error('Failed to get eligible campaigns:', err);
      // Fail gracefully so the feed doesn't crash
      return [];
    }
  }

  /**
   * Tracks an ad impression securely
   */
  static async trackImpression(
    campaignId: string, 
    userId: string | undefined, 
    placement: InternalAdPlacement,
    feedPosition?: number
  ) {
    try {
      // Don't await this so it doesn't block UI renders. Fire and forget securely.
      supabase.from('internal_ad_impressions').insert({
        campaign_id: campaignId,
        user_id: userId,
        placement,
        feed_position: feedPosition,
        seen_at: new Date().toISOString()
      }).then(({ error }) => {
        if (error) console.warn('Ad impression tracking failed:', error);
      });
    } catch (e) {
      // Silent catch to never crash app tracking
    }
  }

  /**
   * Tracks an ad click securely
   */
  static async trackClick(
    campaignId: string, 
    userId: string | undefined, 
    placement: InternalAdPlacement,
    actionType: InternalAdActionType
  ) {
    try {
      const { error } = await supabase.from('internal_ad_clicks').insert({
        campaign_id: campaignId,
        user_id: userId,
        placement,
        action_type: actionType,
        clicked_at: new Date().toISOString()
      });
      if (error) console.warn('Ad click tracking failed:', error);
    } catch (e) {
      // Silent catch
    }
  }
}
