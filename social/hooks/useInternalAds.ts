import { useState, useEffect, useCallback, useRef } from 'react';
import { InternalAdsService } from '../services/InternalAdsService';
import { InternalAdCampaign, InternalAdPlacement } from '../types/ads';

interface UseInternalAdsProps {
  placement: InternalAdPlacement;
  userId?: string;
  insertionFrequency?: number; // Ex: insert an ad every 4 items
}

export function useInternalAds({ placement, userId, insertionFrequency = 5 }: UseInternalAdsProps) {
  const [campaigns, setCampaigns] = useState<InternalAdCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const trackedImpressions = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fetchAds = async () => {
      setLoading(true);
      const eligible = await InternalAdsService.getEligibleCampaigns(placement);
      setCampaigns(eligible);
      setLoading(false);
    };
    fetchAds();
  }, [placement]);

  /**
   * Intersection Observer callback trick to track impressions exactly once.
   */
  const trackImpression = useCallback((campaignId: string, position: number) => {
    if (trackedImpressions.current.has(campaignId)) return;
    
    // Check if it's actually in viewport in the UI component, this acts as the final trigger
    InternalAdsService.trackImpression(campaignId, userId, placement, position);
    trackedImpressions.current.add(campaignId);
  }, [userId, placement]);

  /**
   * Tracks a click and performs the action
   */
  const trackClickAndAct = useCallback((campaign: InternalAdCampaign) => {
    InternalAdsService.trackClick(campaign.id, userId, placement, campaign.action_type);
    
    // Execute action safely
    try {
      if (campaign.action_type === 'open_external_link') {
        window.open(campaign.action_value, '_blank');
      } else if (campaign.action_type === 'open_profile') {
        // Dispatch global navigation event to profile
        window.dispatchEvent(new CustomEvent('arena_navigate', { 
          detail: { view: 'PROFILE', username: campaign.action_value } 
        }));
      } else if (campaign.action_type === 'open_whatsapp') {
        window.open(`https://wa.me/${campaign.action_value.replace(/\D/g,'')}`, '_blank');
      }
      // other actions to be fully mapped...
    } catch (e) {
      console.warn("Failed to perform ad action", e);
    }
  }, [userId, placement]);

  /**
   * Insertion Engine: mixes common content array with ads array
   */
  const injectAdsIntoFeed = useCallback(<T,>(items: T[]): (T | { isAd: true; campaign: InternalAdCampaign })[] => {
    if (!campaigns || campaigns.length === 0 || items.length === 0) return items;
    
    const mixedFeed: any[] = [];
    let adIndex = 0;

    items.forEach((item, index) => {
      mixedFeed.push(item);
      
      // Never insert ad as the very first item (index 0).
      // Insert every `insertionFrequency` items.
      if (index > 0 && (index + 1) % insertionFrequency === 0) {
        if (adIndex < campaigns.length) {
          mixedFeed.push({ isAd: true, campaign: campaigns[adIndex] });
          adIndex++;
        }
      }
    });

    return mixedFeed;
  }, [campaigns, insertionFrequency]);

  return {
    campaigns,
    loading,
    injectAdsIntoFeed,
    trackImpression,
    trackClickAndAct
  };
}
