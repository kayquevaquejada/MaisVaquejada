import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://oisrjnhsrhnhwhcmyutq.supabase.co";
const supabaseAnonKey = "sb_publishable_NlV5EDvJLhrVX0j7T4rNcg_kdo0vB-P";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // Mantém sessão no localStorage (crítico para mobile)
    autoRefreshToken: true,      // Renova token automaticamente antes de expirar
    detectSessionInUrl: true,    // Detecta sessão via URL (OAuth redirect)
    storage: window.localStorage // Força uso do localStorage (mais estável que sessionStorage no Safari)
  }
});
