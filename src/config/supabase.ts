import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

if (!env.supabaseUrl || !env.supabaseAnonKey) {
  console.warn(
    '[Supabase Client] WARNING: supabaseUrl or supabaseAnonKey is missing. ' +
    'The client will run in offline/fallback mode.'
  );
}

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

console.log('[Supabase Client] Client successfully initialized.');
