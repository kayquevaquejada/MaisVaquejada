import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maisvaquejada.app',
  appName: '+Vaquejada',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '833804814174-iqpspdjar3kj5qsadmug4if3mu90m6sm.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
  android: {
    allowMixedContent: true,
    overrideUserAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36'
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    backgroundColor: '#0F0A05',
    preferredContentMode: 'mobile'
  }
};


export default config;
