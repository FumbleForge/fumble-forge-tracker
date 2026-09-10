import { createClient } from '@supabase/supabase-js'

// Fallback to placeholder values if keys are missing (prevents startup crashes on Vercel/OBS)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder-url.supabase.co"
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder"

console.log("Supabase URL geladen:", import.meta.env.VITE_SUPABASE_URL ? "Ja" : "NEIN")
console.log("Supabase Key geladen:", import.meta.env.VITE_SUPABASE_ANON_KEY ? "Ja" : "NEIN")

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})