import { PostItem, StoryItem as GlobalStoryItem, User } from '../../types';

export interface SocialPost extends PostItem {
  avatarUrl?: string;
  isLiked?: boolean;
}

export interface Story {
  id: string;
  username: string;
  avatar: string;
  items: StoryMedia[];
  hasNew: boolean;
}

export interface StoryMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
  duration: number;
  created_at: string;
}

export interface ArenaNotification {
  id: string;
  user_id: string;
  actor_id: string;
  actor_username?: string;
  actor_avatar?: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'mention';
  message?: string;
  reference_id?: string;
  is_read: boolean;
  created_at: string;
  metadata?: any;
}

export interface SocialComment {
  id: string;
  post_id: string;
  user_id: string;
  username: string;
  text: string;
  created_at: string;
  avatar_url?: string;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  media_url?: string;
  is_read: boolean;
}

export interface ChatConversation {
  id: string;
  other_user_id: string;
  other_username: string;
  other_avatar?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
}
