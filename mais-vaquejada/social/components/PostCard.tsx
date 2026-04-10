import React, { useState } from 'react';
import { SocialPost } from '../types';

interface PostCardProps {
  post: SocialPost;
  isLiked: boolean;
  likeCount: number;
  commentCount: number;
  onLike: (post: SocialPost) => void;
  onComment: (post: SocialPost) => void;
  onShare: (post: SocialPost) => void;
  onNavigateToProfile: (username: string) => void;
  onOptions: (post: SocialPost) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  isLiked,
  likeCount,
  commentCount,
  onLike,
  onComment,
  onShare,
  onNavigateToProfile,
  onOptions
}) => {
  const [imgError, setImgError] = useState(false);
  const [showLikeAnim, setShowLikeAnim] = useState(false);

  // Double-tap to like
  const handleDoubleTap = () => {
    if (!isLiked) {
      onLike(post);
      setShowLikeAnim(true);
      setTimeout(() => setShowLikeAnim(false), 800);
    }
  };

  return (
    <article className="mb-2 last:mb-0 border-t border-white/5 pt-2">
      {/* Post Header */}
      <div className="px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            onClick={() => onNavigateToProfile(post.username)}
            className="w-10 h-10 rounded-full border border-[#ECA413]/30 p-0.5 cursor-pointer active:scale-95 transition-transform bg-neutral-800"
          >
            <img
              className="w-full h-full object-cover rounded-full"
              src={post.avatarUrl || `https://ui-avatars.com/api/?name=${post.username}&background=random`}
              alt={post.username}
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${post.username}&background=random`;
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-1 cursor-pointer hover:underline" onClick={() => onNavigateToProfile(post.username)}>
              <span className="font-black text-[13px] text-white tracking-tight">{post.username}</span>
              {post.isVerified && <span className="material-icons text-[#ECA413] text-[14px]">verified</span>}
            </div>
            <div className="flex items-center gap-1 opacity-60">
              <span className="material-icons text-[#ECA413] text-[10px]">place</span>
              <span className="text-[9px] font-black text-white uppercase tracking-wider">{post.location}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => onOptions(post)}
          className="material-icons text-white/40 text-xl hover:text-white transition-colors"
        >
          more_vert
        </button>
      </div>

      {/* Post Media */}
      <div 
        className="relative w-full overflow-hidden bg-neutral-900 group min-h-[300px] flex items-center justify-center"
        onDoubleClick={handleDoubleTap}
      >
        {!imgError ? (
          <img
            className="w-full aspect-square object-cover"
            src={post.imageUrl}
            alt="Post content"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center opacity-20">
            <span className="material-icons text-4xl mb-2">image_not_supported</span>
            <span className="text-[10px] font-black uppercase tracking-widest">Mídia não disponível</span>
          </div>
        )}

        {/* Double-tap heart animation */}
        {showLikeAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <span className="material-icons text-white text-[80px] animate-ping drop-shadow-2xl">favorite</span>
          </div>
        )}

        {post.isFeature && (
          <div className="absolute top-4 right-4 bg-background-dark/40 backdrop-blur-sm px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-[0.1em] border border-white/10 text-white/90">
            DESTAQUE
          </div>
        )}
      </div>

      {/* Interaction Bar */}
      <div className="px-5 py-4 flex justify-between items-center">
        <div className="flex gap-6 items-center">
          <button
            onClick={() => onLike(post)}
            className="flex items-center gap-2 group active:scale-125 transition-transform"
          >
            <span className={`material-icons text-[26px] transition-colors ${isLiked ? 'text-red-500' : 'text-white'}`}>
              {isLiked ? 'favorite' : 'favorite_border'}
            </span>
            <span className="text-[14px] font-black text-white/90 tracking-tight">
              {likeCount}
            </span>
          </button>
          <button
            onClick={() => onComment(post)}
            className="flex items-center gap-2"
          >
            <span className="material-icons text-[24px] text-white">chat_bubble_outline</span>
            <span className="text-[14px] font-black text-white/90 tracking-tight">{commentCount}</span>
          </button>
          <button onClick={() => onShare(post)}>
            <span className="material-icons text-[24px] text-white">send</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button>
            <span className="material-icons text-[24px] text-white/60">bookmark_border</span>
          </button>
        </div>
      </div>

      {/* Post Content */}
      <div className="px-5 pb-6 space-y-1.5">
        {likeCount > 0 && (
          <p className="text-[13px] font-black text-white">
            {likeCount} {likeCount === 1 ? 'curtida' : 'curtidas'}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {post.hashtags.map(tag => (
            <span key={tag} className="text-[#ECA413] text-[11px] font-black uppercase tracking-wider">
              {tag}
            </span>
          ))}
        </div>
        <p className="text-[13.5px] leading-snug">
          <span
            className="font-black mr-2 text-white cursor-pointer hover:underline"
            onClick={() => onNavigateToProfile(post.username)}
          >
            {post.username}
          </span>
          <span className="text-white/90 font-medium">{post.caption}</span>
        </p>
        {commentCount > 0 && (
          <button
            onClick={() => onComment(post)}
            className="text-[11px] font-black opacity-40 text-white uppercase tracking-widest block py-0.5 active:opacity-100"
          >
            Ver todos os {commentCount} comentários
          </button>
        )}
        <div className="text-[9px] font-black opacity-30 text-white uppercase tracking-[0.15em]">{post.timeAgo}</div>
      </div>
    </article>
  );
};
