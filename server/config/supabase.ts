import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
  console.warn(
    '[Supabase Server Client] WARNING: SUPABASE_URL or SUPABASE_ANON_KEY is missing. ' +
    'Database integrations will fail.'
  );
}

// Use the service-role key only when it is present and non-empty.
// SUPABASE_SERVICE_ROLE_KEY is optional for local development.
// When absent, the anon key is used and privileged database writes are unavailable.
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
export const isPrivileged = serviceRoleKey.length > 0;

const supabaseKey = isPrivileged ? serviceRoleKey : env.SUPABASE_ANON_KEY;

export const supabase = createClient(env.SUPABASE_URL, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

if (isPrivileged) {
  console.log('[Supabase Server Client] Initialized with service-role key (privileged mode).');
} else {
  console.warn(
    '[Supabase Server Client] SUPABASE_SERVICE_ROLE_KEY is not set. ' +
    'Running with anon key — privileged database writes are unavailable. ' +
    'Provide SUPABASE_SERVICE_ROLE_KEY in .env to enable full persistence.'
  );
}
