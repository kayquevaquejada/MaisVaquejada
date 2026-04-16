import React from 'react';
import { ArenaNotification } from '../types';
import { getNotifText, timeAgo } from '../../lib/notifications';

interface NotificationsPanelProps {
  notifications: ArenaNotification[];
  onClose: () => void;
  onNotificationPress: (notif: ArenaNotification) => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  notifications,
  onClose,
  onNotificationPress
}) => {
  return (
    <>
      {/* Click Outside to Dismiss */}
      <div className="fixed inset-0 z-40" onClick={onClose}></div>
      <div className="absolute top-[68px] right-4 w-[300px] z-50 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h3 className="font-black text-white tracking-widest text-[11px] uppercase">Ações & Notificações</h3>
          <button onClick={onClose} className="material-icons text-white/40 text-sm">close</button>
        </div>
        <div className="max-h-[350px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-10 text-center opacity-40">
              <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma notificação</p>
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                className="p-4 border-b border-white/5 flex gap-3 items-center hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => onNotificationPress(notif)}
              >
                <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden shrink-0">
                  <img 
                    src={notif.actor_avatar || `https://ui-avatars.com/api/?name=${notif.actor_username}&background=random`} 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${notif.actor_username || 'User'}&background=random`;
                    }}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[12px] text-white/90 leading-tight">
                    {getNotifText(notif as any)}
                  </p>
                  <p className="text-[#ECA413] text-[9px] font-black uppercase tracking-wider mt-1">{timeAgo(notif.created_at)}</p>
                </div>
                {notif.post_media_url && (
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0">
                    <img src={notif.post_media_url} className="w-full h-full object-cover" />
                  </div>
                )}
                {!notif.is_read && !notif.post_media_url && <div className="w-2 h-2 rounded-full bg-[#ECA413]"></div>}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
