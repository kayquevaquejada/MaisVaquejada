import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { persistence, PersistenceKey } from './persistence';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Adaptador robusto para o Capacitor Preferences
const CapacitorPreferencesStorage = {
  getItem: async (key: string) => {
    try {
      const { value } = await Preferences.get({ key });
      return value;
    } catch (e) {
      console.error('Storage getItem error:', e);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await Preferences.set({ key, value });
    } catch (e) {
      console.error('Storage setItem error:', e);
    }
  },
  removeItem: async (key: string) => {
    try {
      await Preferences.remove({ key });
    } catch (e) {
      console.error('Storage removeItem error:', e);
    }
  },
};

// Inicialização segura
let supabaseInstance: any;

try {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Configurações do Supabase ausentes (VITE_SUPABASE_URL/KEY)');
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: CapacitorPreferencesStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: !Capacitor.isNativePlatform(),
      flowType: 'pkce'
    }
  });
  
  // Attempt to restore persisted Supabase auth session manually if needed
  // Note: createClient with storage already does some persistence, but we added a second layer
  (async () => {
    const saved = await persistence.load<any>(PersistenceKey.SUPABASE_SESSION);
    if (saved) {
      try {
        await supabaseInstance.auth.setSession(saved);
      } catch (e) {
        console.warn('Failed to restore Supabase session', e);
      }
    }
  })();

  // Listen to auth state changes and persist the session
  supabaseInstance.auth.onAuthStateChange((event, session) => {
    if (session) {
      persistence.save(PersistenceKey.SUPABASE_SESSION, session);
    } else {
      persistence.remove(PersistenceKey.SUPABASE_SESSION);
    }
  });
} catch (e) {
  console.error('Supabase Critical Init Error:', e);
  // Objeto fallback para evitar crashes de "cannot read property of undefined"
  supabaseInstance = {
    auth: { 
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: async () => ({ data: { session: null }, error: e }),
      signOut: async () => ({ error: null }),
      setSession: async () => ({ error: null })
    },
    from: () => ({ 
      select: () => ({ 
        eq: () => ({ 
          maybeSingle: async () => ({ data: null, error: e }),
          order: () => ({ maybeSingle: async () => ({ data: null, error: e }) })
        }),
        order: () => ({ select: () => ({}) }) 
      }) 
    }),
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
      subscribe: () => ({})
    })
  };
}

export const supabase = supabaseInstance;
