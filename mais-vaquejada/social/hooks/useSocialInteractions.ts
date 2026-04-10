import { useState, useCallback } from 'react';
import { SocialService } from '../services/SocialService';
import { SocialPost, SocialComment } from '../types';
import { createNotification } from '../../lib/notifications';

export function useSocialInteractions(user: any) {
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [commentsMap, setCommentsMap] = useState<Record<string, SocialComment[]>>({});
  const [commentLoading, setCommentLoading] = useState(false);

  const toggleLike = useCallback(async (post: SocialPost) => {
    if (!user?.id) return;

    const isLiking = !likedPosts.has(post.id);
    
    // Optimistic Update
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (isLiking) next.add(post.id);
      else next.delete(post.id);
      return next;
    });

    try {
      if (isLiking) {
        await SocialService.likePost(user.id, post.id);
        if (post.userId !== user.id) {
          await createNotification({
            user_id: post.userId,
            actor_id: user.id,
            type: 'like',
            reference_id: post.id
          });
        }
      } else {
        // Ideally we'd have an unlikePost service
      }
    } catch (err) {
      console.error('Like error:', err);
      // Rollback
      setLikedPosts(prev => {
        const next = new Set(prev);
        if (isLiking) next.delete(post.id);
        else next.add(post.id);
        return next;
      });
    }
  }, [user?.id, likedPosts]);

  const loadComments = useCallback(async (postId: string) => {
    setCommentLoading(true);
    try {
      const comments = await SocialService.fetchComments(postId);
      setCommentsMap(prev => ({ ...prev, [postId]: comments }));
    } catch (err) {
      console.error('Load comments error:', err);
    } finally {
      setCommentLoading(false);
    }
  }, []);

  return {
    likedPosts,
    toggleLike,
    commentsMap,
    loadComments,
    commentLoading
  };
}
