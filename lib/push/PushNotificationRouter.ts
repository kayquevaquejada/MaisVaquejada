import { ActionPerformed } from '@capacitor/push-notifications';
import { View } from '../../types';

export class PushNotificationRouter {
    static handlePushClick(notification: ActionPerformed) {
        try {
            const data = notification.notification.data;
            if (!data) {
                // Fallback to home
                this.navigate(View.EVENTS);
                return;
            }

            // Extract route or entityId based on payload schema
            const route = data.route; // e.g. '/perfil/username'
            const type = data.type; // 'news', 'live', 'social'
            const entityId = data.entityId;

            if (route) {
                // Custom routing logic based on string route (future proof)
                if (route.startsWith('/perfil/')) {
                    const username = route.split('/')[2];
                    this.navigate(View.PROFILE, username);
                } else if (route === '/noticias') {
                    this.navigate(View.NEWS);
                } else if (route === '/arena') {
                    this.navigate(View.SOCIAL);
                } else if (route === '/mercado') {
                    this.navigate(View.MERCADO);
                } else {
                    this.navigate(View.EVENTS);
                }
                return;
            }

            // Type-based routing
            switch (type) {
                case 'news':
                    this.navigate(View.NEWS);
                    break;
                case 'live':
                    this.navigate(View.NEWS); // Lives are inside NewsView right now
                    break;
                case 'social':
                case 'messages':
                    this.navigate(View.SOCIAL);
                    break;
                default:
                    this.navigate(View.EVENTS); // Fallback
                    break;
            }

        } catch (e) {
            console.error('PushNotificationRouter Error:', e);
            // Always fallback safely
            this.navigate(View.EVENTS);
        }
    }

    private static navigate(view: View, username?: string, event?: any) {
        // Dispatch custom event to App.tsx
        window.dispatchEvent(new CustomEvent('arena_navigate', {
            detail: { view, username, event }
        }));
    }
}
