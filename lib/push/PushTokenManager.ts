import { PushNotifications, Token } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../supabase';

export class PushTokenManager {
    static async registerDevice(userId: string) {
        if (!Capacitor.isNativePlatform()) return; // Fallback silently for Web

        try {
            // Register with Apple / Google to receive push via APNS/FCM
            await PushNotifications.register();

            // On success, we should receive the token via listener (usually setup in PushPermissionManager)
            // But we can also handle it here if it's already registered.
            // Capacitor PushNotifications plugin fires 'registration' event.
            // We'll set that up in the App.tsx or PushManager initialization.
        } catch (e) {
            console.warn('Failed to register device for push:', e);
        }
    }

    static async saveTokenToSupabase(userId: string, token: string) {
        if (!userId || !token) return;

        const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
        
        try {
            const { error } = await supabase.from('push_tokens').upsert({
                user_id: userId,
                token: token,
                platform: platform,
                last_used_at: new Date().toISOString()
            }, {
                onConflict: 'token,user_id'
            });

            if (error) throw error;
            console.log('Push token saved/updated successfully.');
        } catch (err) {
            console.error('Error saving push token to Supabase:', err);
        }
    }

    static async unregisterDevice(userId: string) {
        // Just invalidate the token in Supabase
        // Optional: remove all tokens for this user on this specific device if we had a reliable device_id
        try {
            await supabase.from('push_tokens').delete().eq('user_id', userId);
        } catch (e) {
            console.warn('Silent fail removing tokens', e);
        }
    }
}
