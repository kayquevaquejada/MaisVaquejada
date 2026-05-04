import React, { useState } from 'react';
import { SocialPost, SocialComment } from '../types';

interface CommentSheetProps {
  post: SocialPost;
  comments: SocialComment[];
  user: any;
  onClose: () => void;
  onPostComment: (text: string) => void;
  onNavigateToProfile: (username: string) => void;
}

export const CommentSheet: React.FC<CommentSheetProps> = ({
  post,
  comments,
  user,
  onClose,
  onPostComment,
  onNavigateToProfile
}) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (text.trim()) {
      onPostComment(text.trim());
      setText('');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end animate-in slide-in-from-bottom duration-300 pointer-events-none">
      {/* Click to dismiss */}
      <div className="absolute inset-0 bg-black/60 pointer-events-auto" onClick={onClose}></div>
      
      <div className="bg-[#1C1C1E] h-[80vh] w-full rounded-t-3xl relative z-10 pointer-events-auto flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-white/5">
        <div className="flex justify-center p-3">
          <div className="w-10 h-1 rounded-full bg-white/20"></div>
        </div>
        <div className="px-6 py-2 border-b border-white/5 text-center">
          <h3 className="font-black text-xs text-white uppercase tracking-widest">Comentários</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Post Caption as first comment-like block */}
          <div className="flex gap-4 pb-6 border-b border-white/5">
            <div className="w-8 h-8 rounded-full border border-white/10 shrink-0 overflow-hidden">
              <img src={post.avatarUrl || `https://ui-avatars.com/api/?name=${post.username}&background=random`} />
            </div>
            <div>
              <p className="text-[13px] text-white/90 leading-snug">
                <span className="font-black mr-2 text-white">{post.username}</span>
                {post.caption}
              </p>
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-2 block">{post.timeAgo}</span>
            </div>
          </div>

          <div className="space-y-6">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-4">
                <div 
                  className="w-8 h-8 rounded-full border border-white/10 shrink-0 overflow-hidden cursor-pointer" 
                  onClick={() => { onClose(); onNavigateToProfile(comment.username) }}
                >
                  <img src={comment.avatar_url || `https://ui-avatars.com/api/?name=${comment.username}&background=random`} />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] text-white/90 leading-snug">
                    <span 
                      onClick={() => { onClose(); onNavigateToProfile(comment.username) }} 
                      className="font-black mr-2 text-white cursor-pointer"
                    >
                      {comment.username}
                    </span>
                    {comment.text}
                  </p>
                  <div className="flex gap-4 items-center mt-1">
                    <span className="text-[10px] font-bold text-white/40">Agora</span>
                    <button className="text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-white">Responder</button>
                  </div>
                </div>
                <button className="material-icons text-[14px] text-white/20 hover:text-red-500 transition-colors">favorite_border</button>
              </div>
            ))}

            {comments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 opacity-20">
                <span className="material-icons text-4xl mb-2">chat_bubble_outline</span>
                <p className="text-[10px] font-black uppercase tracking-widest">Nenhum comentário ainda</p>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-background-dark/80 backdrop-blur-md border-t border-white/5 relative">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-neutral-800 shrink-0 border border-white/10 overflow-hidden">
              <img src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`} />
            </div>
            <div className="flex-1 bg-white/10 rounded-full flex items-center px-4 border border-white/10">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && text.trim()) {
                    handleSubmit();
                  }
                }}
                className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-white/40"
                placeholder="Adicione um comentário..."
              />
            </div>
            {text.trim() && (
              <button 
                onClick={handleSubmit} 
                className="font-black text-[12px] text-[#ECA413] px-2 uppercase active:scale-95 transition-transform"
              >
                Publicar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
