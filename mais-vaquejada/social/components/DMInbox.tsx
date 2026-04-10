import React from 'react';
import { ChatConversation } from '../types';
import { timeAgo } from '../../lib/notifications';
import { useInternalAds } from '../hooks/useInternalAds';

interface DMInboxProps {
  conversations: ChatConversation[];
  onSelectConversation: (partnerId: string) => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  searchResults: any[];
  userId?: string;
}

export const DMInbox: React.FC<DMInboxProps> = ({
  conversations,
  onSelectConversation,
  onSearch,
  searchQuery,
  searchResults,
  userId
}) => {
  const { injectAdsIntoFeed, trackImpression, trackClickAndAct } = useInternalAds({
    placement: 'dm_sponsored_slot',
    userId,
    insertionFrequency: 4
  });

  return (
    <div className="flex-1 flex flex-col bg-background-dark overflow-hidden">
      {/* Search Bar */}
      <div className="p-4">
        <div className="bg-white/5 rounded-2xl flex items-center px-4 border border-white/5">
          <span className="material-icons text-white/20 text-xl mr-3">search</span>
          <input
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none py-3 text-sm text-white placeholder:text-white/20"
            placeholder="Pesquisar conversa..."
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {searchQuery.length >= 2 ? (
          <div className="p-4 space-y-4">
            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2">Sugestões</h4>
            {searchResults.map(result => (
              <div
                key={result.id}
                onClick={() => onSelectConversation(result.id)}
                className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-all cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full border-2 border-[#ECA413] p-0.5">
                  <img src={result.avatar_url || `https://ui-avatars.com/api/?name=${result.username}&background=random`} className="w-full h-full rounded-full object-cover" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">{result.name || result.username}</h3>
                  <p className="text-[11px] text-[#ECA413] font-black uppercase tracking-tighter">@{result.username}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 opacity-20">
                <span className="material-icons text-6xl mb-4">chat_bubble_outline</span>
                <p className="text-[11px] font-black uppercase tracking-widest">Inicie uma conversa</p>
              </div>
            ) : (
              injectAdsIntoFeed(conversations).map((item: any, index: number) => {
                if (item.isAd) {
                  return (
                    <div
                      key={`ad-${item.campaign.id}-${index}`}
                      className="flex items-center gap-4 p-5 hover:bg-white/5 bg-[#ECA413]/5 transition-all cursor-pointer group"
                      ref={(el) => { if (el) trackImpression(item.campaign.id, index); }}
                      onClick={() => trackClickAndAct(item.campaign)}
                    >
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full border-2 border-[#ECA413] p-0.5 group-hover:bg-[#ECA413]/20 transition-colors">
                          <img src={item.campaign.advertiser_logo_url || item.campaign.main_media_url} className="w-full h-full rounded-full object-cover" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <h3 className="font-black text-sm text-[#ECA413] uppercase tracking-tighter truncate">{item.campaign.advertiser_name}</h3>
                          <span className="text-[7px] font-black bg-[#ECA413]/20 text-[#ECA413] px-1.5 py-0.5 rounded uppercase tracking-widest">Patrocinado</span>
                        </div>
                        <p className="text-[12px] text-white/70 font-medium truncate leading-tight">{item.campaign.public_title}</p>
                      </div>
                    </div>
                  );
                }
                const conv = item;
                return (
                  <div
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.other_user_id)}
                    className="flex items-center gap-4 p-5 hover:bg-white/5 transition-all cursor-pointer group"
                  >
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full border border-white/10 p-0.5 group-hover:border-[#ECA413] transition-colors">
                        <img src={conv.other_avatar || `https://ui-avatars.com/api/?name=${conv.other_username}&background=random`} className="w-full h-full rounded-full object-cover" />
                      </div>
                      {conv.unread_count > 0 && (
                        <div className="absolute top-0 -right-1 bg-[#ECA413] text-background-dark text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-background-dark">
                          {conv.unread_count}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="font-black text-sm text-white uppercase tracking-tighter truncate">@{conv.other_username}</h3>
                        <span className="text-[9px] font-black text-white/20 uppercase">{conv.last_message_time ? timeAgo(conv.last_message_time) : ''}</span>
                      </div>
                      <p className="text-[12px] text-white/40 truncate leading-tight">{conv.last_message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
