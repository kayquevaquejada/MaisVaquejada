import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { PushTokenManager } from './PushTokenManager';
import { PushNotificationRouter } from './PushNotificationRouter';
import { Preferences } from '@capacitor/preferences';

export class PushPermissionManager {
    static async initialize(userId: string) {
        if (!Capacitor.isNativePlatform()) return;

        try {
            // Check current permission status
            let permStatus = await PushNotifications.checkPermissions();

            if (permStatus.receive === 'granted') {
                // If already granted, register to get the token again
                await this.registerListeners(userId);
                await PushTokenManager.registerDevice(userId);
            }
        } catch (e) {
            console.warn('Silent fail initializing push permissions:', e);
        }
    }

    static async requestPermission(userId: string): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) return false;

        try {
            // Check if we've already asked
            const { value } = await Preferences.get({ key: `push_requested_${userId}` });
            if (value === 'true') {
                let permStatus = await PushNotifications.checkPermissions();
                if (permStatus.receive === 'granted') {
                    await this.registerListeners(userId);
                    await PushTokenManager.registerDevice(userId);
                    return true;
                }
                // If denied, we can't request again via code, user must go to OS settings.
                return false;
            }

            // We haven't asked yet, request from OS
            let permStatus = await PushNotifications.requestPermissions();
            
            // Mark that we asked
            await Preferences.set({ key: `push_requested_${userId}`, value: 'true' });

            if (permStatus.receive === 'granted') {
                await this.registerListeners(userId);
                await PushTokenManager.registerDevice(userId);
                return true;
            }

            return false;
        } catch (e) {
            console.warn('Failed to request push permission:', e);
            return false;
        }
    }

    private static async registerListeners(userId: string) {
        // Prevent multiple listeners
        await PushNotifications.removeAllListeners();

        // On success, we send the token to Supabase
        PushNotifications.addListener('registration', async (token) => {
            console.log('Push registration success, token: ' + token.value);
            await PushTokenManager.saveTokenToSupabase(userId, token.value);
        });

        // Some issue with our setup and push will not work
        PushNotifications.addListener('registrationError', (error: any) => {
            console.warn('Error on push registration: ', error);
        });

        // Show us the notification payload if the app is open on our device
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push received: ', notification);
            // We could show a local toast here if we want, but usually it's handled.
        });

        // Method called when tapping on a notification
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            console.log('Push action performed: ', notification);
            PushNotificationRouter.handlePushClick(notification);
        });
    }
}
