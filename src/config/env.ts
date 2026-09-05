interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isDevelopment: boolean;
}

const getEnv = (): EnvConfig => {
  const supabaseUrl =
    (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
    import.meta.env.VITE_SUPABASE_URL ||
    (import.meta.env as any).NEXT_PUBLIC_SUPABASE_URL ||
    '';
  const supabaseAnonKey =
    (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    (import.meta.env as any).NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';
  const isDevelopment = import.meta.env.MODE === 'development';

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      'WARNING: Supabase URL or Anon Key is missing. Database integration will run in fallback/mock mode client-side.'
    );
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    isDevelopment,
  };
};

export const env = getEnv();

