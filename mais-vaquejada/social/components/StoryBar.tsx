import React from 'react';
import { Story } from '../types';

interface StoryItemProps {
  story: Story;
  isMe?: boolean;
  onPress: () => void;
  onProfilePress?: () => void;
}

export const StoryItem: React.FC<StoryItemProps> = ({ story, isMe, onPress, onProfilePress }) => {
  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0">
      <div
        onClick={onPress}
        className={`relative w-[72px] h-[72px] rounded-full p-[2.5px] cursor-pointer active:scale-95 transition-transform ${
          story.hasNew ? 'bg-gradient-to-tr from-[#ECA413] via-[#8B4513] to-[#ECA413]' : 'bg-white/10'
        }`}
      >
        <div className="w-full h-full rounded-full border-[3px] border-background-dark overflow-hidden bg-neutral-800">
          <img
            src={story.avatar}
            className="w-full h-full object-cover"
            alt={story.username}
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${story.username}&background=random`;
            }}
          />
        </div>
        {isMe && (
          <div className="absolute bottom-0 right-1 bg-[#ECA413] w-6 h-6 rounded-full border-[3px] border-background-dark flex items-center justify-center">
            <span className="material-icons text-background-dark text-[16px] font-black">add</span>
          </div>
        )}
      </div>
      <span
        onClick={onProfilePress}
        className={`text-[10px] font-bold tracking-tight cursor-pointer hover:underline ${
          story.hasNew ? 'text-white' : 'opacity-40 text-white'
        }`}
      >
        {isMe ? 'Meu Status' : story.username}
      </span>
    </div>
  );
};

interface StoryBarProps {
  stories: Story[];
  user: any;
  onMePress: () => void;
  onStoryPress: (index: number) => void;
  onProfilePress: (username: string) => void;
}

export const StoryBar: React.FC<StoryBarProps> = ({ stories, user, onMePress, onStoryPress, onProfilePress }) => {
  // Ensure "Meu Status" is always first
  const meStory: Story = {
    id: 'me',
    username: user?.username || 'meu-perfil',
    avatar: user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`,
    items: [],
    hasNew: false
  };

  return (
    <div className="py-4 overflow-x-auto hide-scrollbar whitespace-nowrap border-b border-white/5">
      <div className="flex gap-4 px-6">
        <StoryItem story={meStory} isMe onPress={onMePress} onProfilePress={() => onProfilePress(meStory.username)} />
        {stories.filter(s => s.id !== user?.id).map((story, index) => (
          <StoryItem 
            key={story.id} 
            story={story} 
            onPress={() => onStoryPress(index + 1)} 
            onProfilePress={() => onProfilePress(story.username)} 
          />
        ))}
      </div>
    </div>
  );
};
