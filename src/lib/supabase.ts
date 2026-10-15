import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) || 'https://placeholder.supabase.co';
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'placeholder-anon-key';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * true cuando hay un proyecto Supabase real configurado (.env / variables de Vercel).
 * Con valores de ejemplo (placeholder) la app usa datos de ejemplo en memoria.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl && !supabaseUrl.includes('placeholder') && supabaseUrl.startsWith('https://'),
  );
}
