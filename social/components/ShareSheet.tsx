import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { SocialPost } from '../types';
import { useDMs } from '../hooks/useDMs';

interface ShareSheetProps {
  post: SocialPost;
  user: any;
  onClose: () => void;
  onShareComplete: () => void;
}

export const ShareSheet: React.FC<ShareSheetProps> = ({
  post,
  user,
  onClose,
  onShareComplete
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const { sendMessage } = useDMs(user);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      let query = supabase.from('profiles').select('id, username, name, avatar_url, role').neq('id', user?.id).limit(20);
      
      if (searchQuery.length > 0) {
        query = query.or(`username.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`);
      }
      
      const { data } = await query;
      if (data) setUsers(data);
    };
    
    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, user?.id]);

  const handleSend = async (recipientId: string) => {
    if (!user?.id) return;
    setSendingId(recipientId);
    try {
      const shareData = JSON.stringify({
        type: 'post_share',
        postId: post.id,
        mediaUrl: post.imageUrl,
        username: post.username,
        caption: post.caption,
        avatarUrl: post.userAvatar
      });
      
      await sendMessage(recipientId, shareData);
      onShareComplete();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar.');
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex flex-col justify-end animate-in slide-in-from-bottom duration-300">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>
      
      <div className="bg-[#1C1C1E] h-[70vh] w-full rounded-t-3xl relative z-10 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-white/5 pb-8">
        <div className="flex justify-center p-3">
          <div className="w-10 h-1 rounded-full bg-white/20"></div>
        </div>
        <div className="px-6 py-2 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-black text-xs text-white uppercase tracking-widest">Enviar para</h3>
          <button onClick={onClose} className="material-icons text-white/40">close</button>
        </div>

        <div className="p-4 border-b border-white/5">
          <div className="flex items-center bg-white/10 rounded-full px-4 py-2.5 border border-white/10">
            <span className="material-icons text-white/40 text-[20px] mr-2">search</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-white text-sm w-full placeholder:text-white/40"
              placeholder="Buscar vaqueiros..."
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 divide-y divide-white/5">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-4 py-4">
              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-neutral-800 border border-[#ECA413]/20">
                <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}&background=random`} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-white text-sm truncate">{u.name || u.username}</p>
                <p className="text-[10px] uppercase font-bold tracking-widest text-[#ECA413] truncate">@{u.username}</p>
              </div>
              <button 
                onClick={() => handleSend(u.id)}
                disabled={sendingId === u.id}
                className="bg-[#ECA413] text-black px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {sendingId === u.id ? '...' : 'Enviar'}
                {!sendingId && <span className="material-icons text-sm">send</span>}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
