import { useState, useCallback } from 'react';
import { SocialService } from '../services/SocialService';
import { SocialPost, SocialComment } from '../types';
import { createNotification } from '../../lib/notifications';

export function useSocialInteractions(user: any) {
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, SocialComment[]>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [commentLoading, setCommentLoading] = useState(false);

  // Initialize liked state from feed data
  const initFromFeed = useCallback((posts: SocialPost[]) => {
    setLikedPosts(prev => {
      const liked = new Set(prev);
      posts.forEach(p => {
        if (p.isLikedByMe) liked.add(p.id);
      });
      return liked;
    });
    setLikeCounts(prev => {
      const counts = { ...prev };
      posts.forEach(p => {
        // Only update counts for posts we haven't interacted with recently, 
        // to avoid jumping counts if the server hasn't updated yet.
        counts[p.id] = typeof p.likes === 'number' ? p.likes : parseInt(p.likes.toString()) || 0;
      });
      return counts;
    });
    setCommentCounts(prev => {
      const cCounts = { ...prev };
      posts.forEach(p => {
        cCounts[p.id] = p.comments || 0;
      });
      return cCounts;
    });
  }, []);

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
    setLikeCounts(prev => ({
      ...prev,
      [post.id]: Math.max(0, (prev[post.id] || 0) + (isLiking ? 1 : -1))
    }));

    try {
      if (isLiking) {
        await SocialService.likePost(user.id, post.id);
        // Notify post owner
        if (post.userId !== user.id) {
          await createNotification({
            user_id: post.userId,
            actor_id: user.id,
            type: 'like',
            reference_id: post.id
          });
        }
      } else {
        await SocialService.unlikePost(user.id, post.id);
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
      setLikeCounts(prev => ({
        ...prev,
        [post.id]: Math.max(0, (prev[post.id] || 0) + (isLiking ? -1 : 1))
      }));
    }
  }, [user?.id, likedPosts]);

  const loadComments = useCallback(async (postId: string) => {
    setCommentLoading(true);
    try {
      const comments = await SocialService.fetchComments(postId);
      setCommentsMap(prev => ({ ...prev, [postId]: comments }));
      setCommentCounts(prev => ({ ...prev, [postId]: comments.length }));
    } catch (err) {
      console.error('Load comments error:', err);
    } finally {
      setCommentLoading(false);
    }
  }, []);

  const postComment = useCallback(async (postId: string, text: string, postOwnerId?: string) => {
    if (!user?.id || !text.trim()) return;
    try {
      const result = await SocialService.postComment(user.id, postId, text.trim());
      if (result) {
        // Add to local state immediately
        const newComment: SocialComment = {
          id: result.id,
          post_id: postId,
          user_id: user.id,
          username: (result as any).profiles?.username || user.username || 'vaqueiro',
          text: result.content,
          created_at: result.created_at,
          avatar_url: (result as any).profiles?.avatar_url || user.avatar_url
        };
        setCommentsMap(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), newComment]
        }));
        setCommentCounts(prev => ({
          ...prev,
          [postId]: (prev[postId] || 0) + 1
        }));

        // Notify post owner
        if (postOwnerId && postOwnerId !== user.id) {
          await createNotification({
            user_id: postOwnerId,
            actor_id: user.id,
            type: 'comment',
            reference_id: postId
          });
        }
      }
    } catch (err) {
      console.error('Post comment error:', err);
    }
  }, [user]);

  return {
    likedPosts,
    likeCounts,
    toggleLike,
    commentsMap,
    commentCounts,
    loadComments,
    postComment,
    commentLoading,
    initFromFeed
  };
}
