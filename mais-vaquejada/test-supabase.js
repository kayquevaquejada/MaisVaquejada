import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("No credentials found");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking tables...");
  
  const results = {};
  
  for (const table of ['profiles', 'posts', 'stories', 'follows']) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error && error.code === '42P01') {
      results[table] = "MISSING";
    } else if (error) {
       results[table] = "ERROR: " + error.message;
    } else {
      results[table] = "EXISTS";
    }
  }
  
  console.log("Table status:", results);
  
  console.log("Checking bucket 'vaquejadas'...");
  const { data: buckets, error: bucketError } = await supabase.storage.getBucket('vaquejadas');
  if (bucketError) {
      console.log("Bucket status: ERROR or MISSING -", bucketError.message);
  } else {
      console.log("Bucket 'vaquejadas' EXISTS!");
  }
}
check();
