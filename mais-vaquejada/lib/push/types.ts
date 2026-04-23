export type PushCategory = 'news' | 'live' | 'social' | 'system' | 'campaign' | 'messages';

export interface PushToken {
    id: string;
    user_id: string;
    token: string;
    platform: 'ios' | 'android' | 'web';
    device_id?: string;
    is_active: boolean;
}

export interface PushPreferences {
    news: boolean;
    lives: boolean;
    social: boolean;
    messages: boolean;
    campaigns: boolean;
    system: boolean;
}

export interface PushPayloadSchema {
    id?: string;
    type: PushCategory;
    title: string;
    body: string;
    route?: string; // '/perfil/usuario', '/noticias', '/arena'
    entityId?: string;
    image?: string;
    priority?: 'normal' | 'high';
    metadata?: any;
}
