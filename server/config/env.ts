import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().url({ message: 'SUPABASE_URL must be a valid URL' }),
  SUPABASE_ANON_KEY: z.string().min(1, { message: 'SUPABASE_ANON_KEY is required' }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().min(1, { message: 'GEMINI_API_KEY is required' }),
  OPENWEATHER_API_KEY: z.string().min(1, { message: 'OPENWEATHER_API_KEY is required' }),
  LIVE_GEMINI_TEST: z.boolean().default(false),
});

const getEnv = () => {
  const resolvedSupabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    '';

  const resolvedSupabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';

  const rawEnv = {
    PORT: process.env.PORT || '3001',
    NODE_ENV: process.env.NODE_ENV || 'development',
    SUPABASE_URL: resolvedSupabaseUrl,
    SUPABASE_ANON_KEY: resolvedSupabaseAnonKey,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY || '',
    LIVE_GEMINI_TEST: process.env.LIVE_GEMINI_TEST === 'true',
  };

  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    console.error('Environment validation failed:');
    result.error.errors.forEach((err) => {
      console.error(`- ${err.path.join('.')}: ${err.message}`);
    });

    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('WARNING: Missing or invalid environment variables. Running in fallback/limited development mode.');
    }
  }

  return {
    PORT: Number(rawEnv.PORT),
    NODE_ENV: rawEnv.NODE_ENV,
    SUPABASE_URL: rawEnv.SUPABASE_URL,
    SUPABASE_ANON_KEY: rawEnv.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: rawEnv.SUPABASE_SERVICE_ROLE_KEY,
    GEMINI_API_KEY: rawEnv.GEMINI_API_KEY,
    OPENWEATHER_API_KEY: rawEnv.OPENWEATHER_API_KEY,
    LIVE_GEMINI_TEST: rawEnv.LIVE_GEMINI_TEST,
  };
};

export const env = getEnv();

