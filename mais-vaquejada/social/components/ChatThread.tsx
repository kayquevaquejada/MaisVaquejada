import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';

interface ChatThreadProps {
  partnerId: string;
  partnerUsername: string;
  partnerAvatar?: string;
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string) => void;
  onCall: (type: 'audio' | 'video') => void;
  onBack: () => void;
  onNavigateToProfile: (username: string) => void;
  onViewPost: (postId: string) => void;
}

export const ChatThread: React.FC<ChatThreadProps> = ({
  partnerId,
  partnerUsername,
  partnerAvatar,
  messages,
  currentUserId,
  onSendMessage,
  onCall,
  onBack,
  onNavigateToProfile,
  onViewPost
}) => {
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  const renderMessageContent = (content: string) => {
    try {
      if (content.startsWith('{')) {
        const data = JSON.parse(content);
        if (data.type === 'post_share') {
          return (
            <div 
              className="w-full min-w-[180px] max-w-[240px] overflow-hidden rounded-2xl bg-black/30 border border-white/5 cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
              onClick={() => onViewPost(data.postId)}
            >
              <div className="p-2.5 flex items-center justify-between border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-2 overflow-hidden">
                  <img src={data.avatarUrl || `https://ui-avatars.com/api/?name=${data.username}&background=random`} className="w-5 h-5 rounded-full object-cover shrink-0" />
                  <span className="text-[10px] font-black uppercase text-white/90 tracking-widest truncate">@{data.username}</span>
                </div>
                <span className="material-icons text-white/20 text-xs">chevron_right</span>
              </div>
              <div className="relative aspect-square">
                <img src={data.mediaUrl} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              </div>
              {data.caption && (
                <div className="p-2 px-3">
                  <p className="text-[10px] text-white/50 line-clamp-1 italic">{data.caption}</p>
                </div>
              )}
            </div>
          );
        if (data.type === 'story_reply') {
          return (
            <div className="flex flex-col gap-3 min-w-[180px]">
              <div className="w-[45%] aspect-[9/16] rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-inner">
                <img src={data.mediaUrl} className="w-full h-full object-cover opacity-60" />
              </div>
              <p className="text-[13px] font-medium leading-relaxed italic opacity-90">"{data.text}"</p>
            </div>
          );
        }
      }
    } catch (e) {}
    return <p className="text-[13px] font-medium leading-relaxed">{content}</p>;
  };

  return (
    <div className="flex-1 flex flex-col bg-background-dark overflow-hidden">
      {/* Thread Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-background-dark/95 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="material-icons text-white hover:text-[#ECA413] transition-colors">arrow_back</button>
          <div onClick={() => onNavigateToProfile(partnerUsername)} className="flex items-center gap-3 cursor-pointer active:scale-95 transition-transform">
            <div className="w-10 h-10 rounded-full border-2 border-[#ECA413] p-0.5 overflow-hidden shrink-0">
              <img src={partnerAvatar || `https://ui-avatars.com/api/?name=${partnerUsername}&background=random`} className="w-full h-full rounded-full object-cover" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-white font-black text-[13px] uppercase tracking-tighter leading-none">@{partnerUsername}</h3>
              <p className="text-[#ECA413] text-[9px] font-black uppercase tracking-widest mt-1">Conectado</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-5 pr-2">
          <button onClick={() => onCall('audio')} className="p-1 active:scale-95 transition-all"><span className="material-icons text-[#ECA413] text-2xl">call</span></button>
          <button onClick={() => onCall('video')} className="p-1 active:scale-95 transition-all"><span className="material-icons text-[#ECA413] text-2xl">videocam</span></button>
        </div>
      </header>
 
       {/* Messages Area */}
       <div className="flex-1 overflow-y-auto p-6 space-y-4">
         {messages.map((msg, i) => {
          const isMe = msg.sender_id === currentUserId;
          const isPostShare = msg.content.startsWith('{"type":"post_share"');
          const isSpecial = msg.content.startsWith('{"type":');
 
           return (
             <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-${isMe ? 'right' : 'left'}-4 duration-300`}>
               <div className={`shadow-xl ${
                 isPostShare 
                   ? 'bg-transparent' 
                  : isMe 
                    ? 'max-w-[75%] rounded-3xl px-5 py-3 bg-[#ECA413] text-background-dark rounded-br-none' 
                    : 'max-w-[75%] rounded-3xl px-5 py-3 bg-[#2C2C2E] text-white rounded-bl-none border border-white/5'
              }`}>
                {renderMessageContent(msg.content)}
                <div className={`text-[8px] font-black uppercase tracking-widest mt-1 text-right opacity-50 ${isPostShare ? 'text-white/40' : ''}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background-dark/80 backdrop-blur-md border-t border-white/5">
        <div className="flex gap-4 items-center">
          <button className="material-icons text-white/40 hover:text-white transition-colors">add_circle_outline</button>
          <div className="flex-1 bg-white/5 rounded-full flex items-center px-5 border border-white/10 group focus-within:border-[#ECA413]/50 transition-all">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              className="bg-transparent border-none outline-none py-4 text-sm text-white w-full placeholder:text-white/20"
              placeholder="Digite uma mensagem..."
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              text.trim() ? 'bg-[#ECA413] text-background-dark shadow-lg active:scale-95' : 'bg-white/5 text-white/20'
            }`}
          >
            <span className="material-icons text-2xl">send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
