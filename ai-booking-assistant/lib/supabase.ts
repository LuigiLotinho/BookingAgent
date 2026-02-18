import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

const isServer = typeof window === 'undefined';
const effectiveKey = isServer && supabaseServiceRoleKey ? supabaseServiceRoleKey : supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please check your .env.local file.');
}

if (isServer && !supabaseServiceRoleKey) {
  console.warn(
    'Supabase Service Role Key is missing on server. Writes may fail if RLS is enabled. ' +
      'Set SUPABASE_SERVICE_ROLE_KEY in .env.local.'
  );
}

export const supabase = createClient(supabaseUrl, effectiveKey);
