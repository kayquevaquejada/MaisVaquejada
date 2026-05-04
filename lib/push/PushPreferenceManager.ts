import { supabase } from '../supabase';
import { PushPreferences } from './types';

export class PushPreferenceManager {
    static async getPreferences(userId: string): Promise<PushPreferences | null> {
        if (!userId) return null;
        try {
            const { data, error } = await supabase
                .from('push_preferences')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                // Return default preferences
                return {
                    news: true,
                    lives: true,
                    social: true,
                    messages: true,
                    campaigns: true,
                    system: true
                };
            }

            return data as PushPreferences;
        } catch (e) {
            console.warn('Error fetching push preferences, using fallback:', e);
            return {
                news: true, lives: true, social: true, messages: true, campaigns: true, system: true
            };
        }
    }

    static async updatePreferences(userId: string, prefs: Partial<PushPreferences>) {
        if (!userId) return;
        try {
            // First check if it exists
            const { data: existing } = await supabase.from('push_preferences').select('id').eq('user_id', userId).maybeSingle();
            
            if (existing) {
                await supabase.from('push_preferences').update(prefs).eq('user_id', userId);
            } else {
                await supabase.from('push_preferences').insert({ user_id: userId, ...prefs });
            }
        } catch (e) {
            console.warn('Failed to update push preferences silently', e);
        }
    }
}
