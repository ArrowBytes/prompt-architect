import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// This 'export' right here is what your page.tsx was looking for!
export const supabase = createClient(supabaseUrl, supabaseAnonKey)