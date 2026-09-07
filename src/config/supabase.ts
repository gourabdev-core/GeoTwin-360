import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

const isConfigured = Boolean(
  env.supabaseUrl &&
  env.supabaseAnonKey &&
  env.supabaseUrl.startsWith('http')
);

if (!isConfigured) {
  console.warn(
    '[Supabase Client] WARNING: supabaseUrl or supabaseAnonKey is missing or invalid. ' +
    'The client will run in safe offline/fallback mode.'
  );
}

// Fallback to placeholder endpoint to prevent @supabase/supabase-js from throwing on module evaluation
const safeUrl = isConfigured ? env.supabaseUrl : 'https://offline-fallback.supabase.co';
const safeKey = isConfigured ? env.supabaseAnonKey : 'offline-fallback-key';

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: isConfigured,
    autoRefreshToken: isConfigured,
  },
});

console.log(`[Supabase Client] Client initialized (${isConfigured ? 'Live' : 'Offline Fallback'} mode).`);
