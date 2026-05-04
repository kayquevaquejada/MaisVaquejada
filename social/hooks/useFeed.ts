import { useState, useEffect, useCallback } from 'react';
import { SocialService } from '../services/SocialService';
import { SocialPost, Story } from '../types';

export function useFeed(userId: string | undefined) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (refresh = false) => {
    if (!userId) return;
    
    if (refresh) setIsRefreshing(true);
    else setLoading(true);
    
    setError(null);
    try {
      const followingIds = await SocialService.fetchFollowing(userId);
      const [feedPosts, feedStories] = await Promise.all([
        SocialService.fetchFeed(userId, followingIds),
        SocialService.fetchStories(userId, followingIds)
      ]);
      
      setPosts(feedPosts);
      setStories(feedStories);
    } catch (err: any) {
      console.error('useFeed error:', err);
      setError(err.message || 'Erro ao carregar feed social');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    posts,
    stories,
    loading,
    isRefreshing,
    error,
    refresh: () => loadData(true),
    setPosts
  };
}
