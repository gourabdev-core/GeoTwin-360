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
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
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
      const existingProfile = await profileRepository.getProfile(currentUser.id);
      if (existingProfile) {
        setProfile(existingProfile);
      } else {
        // Synthesize fallback profile from user metadata if table row is pending
        const meta = currentUser.user_metadata || {};
        const fallbackProfile: DatabaseProfile = {
          id: currentUser.id,
          full_name: meta.full_name || meta.name || currentUser.email?.split('@')[0] || 'User',
          email: currentUser.email || '',
          avatar_url: meta.avatar_url || null,
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

  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
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

  const signOut = async (): Promise<void> => {
    try {
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
