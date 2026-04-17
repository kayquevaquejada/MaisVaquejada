import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // Mantém sessão no localStorage (crítico para mobile)
    autoRefreshToken: true,      // Renova token automaticamente antes de expirar
    detectSessionInUrl: true,    // Detecta sessão via URL (OAuth redirect)
    storage: window.localStorage // Força uso do localStorage (mais estável que sessionStorage no Safari)
  }
});
