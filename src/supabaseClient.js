import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug-Check: Falls die App noch leer bleibt, siehst du hier in der Konsole, was fehlt
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase Variablen fehlen! Prüfe deine .env und VITE_ Präfixe.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);