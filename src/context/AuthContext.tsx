import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../config/supabase.js';
import { profileRepository } from '../repositories/profileRepository.js';
import { DatabaseProfile } from '../types/database.js';

export interface AuthContextType {
  user: User | null;
  profile: DatabaseProfile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string; sessionEstablished?: boolean }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string; providerNotConfigured?: boolean }>;
  signInWithGoogleDemo: () => Promise<{ success: boolean; error?: string }>;
  checkGoogleStatus: () => Promise<{ enabled: boolean; message?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DatabaseProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to load or derive profile
  const fetchAndSetProfile = useCallback(async (currentUser: User) => {
    try {
      const meta = currentUser.user_metadata || {};
      const avatar = meta.avatar_url || meta.picture || null;
      const fullName = meta.full_name || meta.name || currentUser.email?.split('@')[0] || 'User';

      const existingProfile = await profileRepository.getProfile(currentUser.id);
      if (existingProfile) {
        if (!existingProfile.avatar_url && avatar) {
          existingProfile.avatar_url = avatar;
        }
        setProfile(existingProfile);
      } else {
        // Synthesize fallback profile from user metadata if table row is pending
        const fallbackProfile: DatabaseProfile = {
          id: currentUser.id,
          full_name: fullName,
          email: currentUser.email || '',
          avatar_url: avatar,
          role: 'Sustainability Lead',
          organization: null,
          created_at: currentUser.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProfile(fallbackProfile);
      }
    } catch (err) {
      console.warn('[AuthContext] Error retrieving profile:', err);
    }
  }, []);

  // Initialize session and listen for auth state changes
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        setLoading(true);
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.warn('[AuthContext] Error fetching initial session:', sessionError.message);
        }

        if (isMounted) {
          if (initialSession?.user) {
            setSession(initialSession);
            setUser(initialSession.user);
            await fetchAndSetProfile(initialSession.user);

            // Clean up hash fragments if returning from OAuth redirect
            if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
          } else if (typeof window !== 'undefined') {
            const rawDemo = localStorage.getItem('geotwin_demo_auth_session');
            if (rawDemo) {
              try {
                const parsed = JSON.parse(rawDemo);
                if (parsed?.user && parsed?.session) {
                  setUser(parsed.user);
                  setSession(parsed.session);
                  setProfile(parsed.profile || null);
                }
              } catch {
                localStorage.removeItem('geotwin_demo_auth_session');
              }
            } else {
              setSession(null);
              setUser(null);
              setProfile(null);
            }
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
          }
        }
      } catch (err: any) {
        console.error('[AuthContext] Auth initialization failed:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    // Subscribe to auth state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (!isMounted) return;

      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchAndSetProfile(currentUser);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchAndSetProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchAndSetProfile(user);
    }
  }, [user, fetchAndSetProfile]);

  /**
   * Format friendly error messages from Supabase Auth errors
   */
  const formatAuthError = (err: AuthError | Error | any): string => {
    if (!err) return 'An unexpected authentication error occurred.';
    const msg = err.message || '';
    if (msg.includes('Invalid login credentials')) {
      return 'Invalid email or password. Please verify your credentials.';
    }
    if (msg.includes('Email not confirmed')) {
      return 'Please verify your email address to continue.';
    }
    if (msg.includes('User already registered') || msg.includes('already registered')) {
      return 'An account already exists with this email address.';
    }
    if (msg.includes('Password should be at least')) {
      return 'Password should be at least 6 characters.';
    }
    if (msg.includes('valid email')) {
      return 'Please enter a valid email address.';
    }
    return msg || 'Authentication request failed.';
  };

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        const friendlyMessage = formatAuthError(signInError);
        setError(friendlyMessage);
        return { success: false, error: friendlyMessage };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await fetchAndSetProfile(data.user);
      }

      return { success: true };
    } catch (err: any) {
      const friendlyMessage = formatAuthError(err);
      setError(friendlyMessage);
      return { success: false, error: friendlyMessage };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<{ success: boolean; error?: string; sessionEstablished?: boolean }> => {
    setError(null);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            name: fullName.trim(),
          },
        },
      });

      if (signUpError) {
        const friendlyMessage = formatAuthError(signUpError);
        setError(friendlyMessage);
        return { success: false, error: friendlyMessage };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await fetchAndSetProfile(data.user);
      }

      return { success: true, sessionEstablished: Boolean(data.session) };
    } catch (err: any) {
      const friendlyMessage = formatAuthError(err);
      setError(friendlyMessage);
      return { success: false, error: friendlyMessage };
    }
  };

  const checkGoogleStatus = useCallback(async (): Promise<{ enabled: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/v1/auth/google-status');
      if (res.ok) {
        const data = await res.json();
        return { enabled: Boolean(data.enabled), message: data.message };
      }
    } catch {
      // Backend not reachable
    }
    return { enabled: false, message: 'Google provider status could not be verified.' };
  }, []);

  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string; providerNotConfigured?: boolean }> => {
    setError(null);
    try {
      // 1. Pre-flight check Google OAuth provider configuration
      const status = await checkGoogleStatus();
      if (!status.enabled) {
        const warning = 'Google OAuth provider is not yet enabled in your Supabase project (Authentication > Providers > Google).';
        setError(warning);
        return { success: false, error: warning, providerNotConfigured: true };
      }

      // 2. Return URL preserves current route rather than dumping user to root
      const returnUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}${window.location.search}`
        : 'http://localhost:5173/dashboard';

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: returnUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (oauthError) {
        const friendlyMessage = formatAuthError(oauthError);
        setError(friendlyMessage);
        return { success: false, error: friendlyMessage };
      }

      return { success: true };
    } catch (err: any) {
      const friendlyMessage = formatAuthError(err);
      setError(friendlyMessage);
      return { success: false, error: friendlyMessage };
    }
  };

  const signInWithGoogleDemo = async (): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    try {
      const demoUser: User = {
        id: 'usr-google-demo-lead',
        app_metadata: { provider: 'google', providers: ['google'] },
        user_metadata: {
          full_name: 'Alex Chen',
          name: 'Alex Chen',
          email: 'alex.chen.climate@gmail.com',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
          picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
        },
        aud: 'authenticated',
        confirmation_sent_at: new Date().toISOString(),
        recovery_sent_at: '',
        email_change_sent_at: '',
        new_email: '',
        invited_at: '',
        action_link: '',
        email: 'alex.chen.climate@gmail.com',
        phone: '',
        created_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
        email_confirmed_at: new Date().toISOString(),
        phone_confirmed_at: '',
        last_sign_in_at: new Date().toISOString(),
        role: 'authenticated',
        updated_at: new Date().toISOString(),
        identities: [],
        factors: [],
      };

      const demoProfile: DatabaseProfile = {
        id: demoUser.id,
        full_name: 'Alex Chen',
        email: 'alex.chen.climate@gmail.com',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
        role: 'Sustainability Lead',
        organization: 'Global Climate Resilience Initiative',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const demoSession: Session = {
        access_token: 'demo-google-session-token',
        token_type: 'bearer',
        expires_in: 86400,
        expires_at: Math.floor(Date.now() / 1000) + 86400,
        refresh_token: 'demo-google-refresh-token',
        user: demoUser,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'geotwin_demo_auth_session',
          JSON.stringify({ user: demoUser, session: demoSession, profile: demoProfile })
        );
      }

      setUser(demoUser);
      setSession(demoSession);
      setProfile(demoProfile);
      return { success: true };
    } catch (err: any) {
      const msg = err.message || 'Failed to initialize demo Google session.';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('geotwin_demo_auth_session');
      }
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      setError(null);
    } catch (err: any) {
      console.error('[AuthContext] Sign out error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        error,
        signIn,
        signUp,
        signInWithGoogle,
        signInWithGoogleDemo,
        checkGoogleStatus,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
