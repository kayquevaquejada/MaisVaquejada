import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY'
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const now = new Date().toISOString();
  console.log("NOW:", now);
  const { data, error } = await supabase
    .from('parceiros_login')
    .select('*')
    .eq('ativo', true)
    .lte('data_inicio', now)
    .or(`data_fim.is.null,data_fim.gte.${now}`)
    .order('destaque', { ascending: false })
    .order('tipo', { ascending: true })
    .order('ordem', { ascending: true });

  console.log("ERROR:", error);
  console.log("DATA:", data);
}

test();
