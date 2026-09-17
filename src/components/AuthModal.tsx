import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, RefreshCw, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { sanitizeErrorMessage } from '../utils/errorSanitizer.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'signin' | 'signup';
  onAuthSuccess?: (user: { name: string; role: string; email: string }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  mode: initialMode,
  onAuthSuccess,
}) => {
  const { signIn, signUp, signInWithGoogle, signInWithGoogleDemo } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, initialMode]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerNotConfigured, setProviderNotConfigured] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (mode === 'signup' && !name)) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setProviderNotConfigured(false);

    try {
      if (mode === 'signin') {
        const result = await signIn(email, password);
        if (!result.success) {
          setError(result.error || 'Incorrect email or password. Please try again.');
          return;
        }
        onAuthSuccess?.({
          name: email.split('@')[0],
          role: 'Sustainability Lead',
          email,
        });
      } else {
        const result = await signUp(email, password, name);
        if (!result.success) {
          setError(result.error || 'Failed to create account.');
          return;
        }
        if (!result.sessionEstablished) {
          setSuccessMessage('Account created successfully! Please check your email to verify your address, then sign in.');
          setMode('signin');
          return;
        }
        onAuthSuccess?.({
          name,
          role: 'Sustainability Lead',
          email,
        });
      }
      onClose();
    } catch (err: any) {
      setError(sanitizeErrorMessage(err, 'An unexpected error occurred. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setProviderNotConfigured(false);
    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        if (result.providerNotConfigured) {
          setProviderNotConfigured(true);
        }
        setError(result.error || 'Google sign-in was canceled or failed.');
        return;
      }
      onClose();
    } catch (err: any) {
      setError(sanitizeErrorMessage(err, 'An error occurred during Google Sign-In.'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await signInWithGoogleDemo();
      if (res.success) {
        onAuthSuccess?.({
          name: 'Alex Chen',
          role: 'Sustainability Lead',
          email: 'alex.chen.climate@gmail.com',
        });
        onClose();
      } else {
        setError(res.error || 'Failed to sign in with Google demo account.');
      }
    } catch (err: any) {
      setError(sanitizeErrorMessage(err, 'An error occurred with demo Google account.'));
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#121519] border border-gray-700 shadow-2xl rounded-2xl p-8 max-w-md w-full relative z-[100000] pointer-events-auto space-y-4"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-silver hover:text-text-base focus:outline-none cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <div className="text-center">
          <h3 className="text-lg font-title font-bold text-text-base">
            {mode === 'signin' ? 'Sign In to GeoTwin' : 'Create an Account'}
          </h3>
          <p className="text-xs text-text-silver mt-1">
            Access high-resolution resilience simulations
          </p>
        </div>

        {successMessage && (
          <div className="bg-[#1ed760]/10 border border-[#1ed760]/30 text-[#1ed760] p-2.5 rounded text-xs">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 rounded text-xs">
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 font-sans">
          {mode === 'signup' && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-silver block mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                disabled={loading}
                className="w-full bg-mid-dark border border-border-gray/60 rounded px-3 py-2 text-xs focus:outline-none focus:border-spotify-green/50 text-text-base disabled:opacity-50"
              />
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-silver block mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              disabled={loading}
              className="w-full bg-mid-dark border border-border-gray/60 rounded px-3 py-2 text-xs focus:outline-none focus:border-spotify-green/50 text-text-base disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-silver block mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="w-full bg-mid-dark border border-border-gray/60 rounded px-3 py-2 text-xs focus:outline-none focus:border-spotify-green/50 text-text-base disabled:opacity-50"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-spotify-green text-black font-semibold text-xs py-2.5 rounded hover:bg-spotify-green/90 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <LogIn size={14} />
                <span>{mode === 'signin' ? 'Sign In' : 'Sign Up'}</span>
              </>
            )}
          </button>
        </form>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-border-gray/40"></div>
          <span className="flex-shrink mx-3 text-[10px] text-text-silver uppercase tracking-wider font-bold">
            Or
          </span>
          <div className="flex-grow border-t border-border-gray/40"></div>
        </div>

        {/* Google Auth Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-[#181b20] hover:bg-[#22272e] text-text-base border border-border-gray hover:border-gray-500 font-semibold text-xs py-2.5 rounded-lg transition-all duration-150 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 shadow-sm"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27A7.17 7.17 0 0 1 4.9 12c0-.79.14-1.57.38-2.27V6.58H1.25A11.97 11.97 0 0 0 0 12c0 1.92.45 3.74 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.93 6.72-4.93z"
            />
          </svg>
          <span>{mode === 'signin' ? 'Sign In with Google' : 'Sign Up with Google'}</span>
        </button>

        {/* Development / Demo Google Fallback */}
        {providerNotConfigured && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-left space-y-2">
            <p className="text-[11px] text-amber-300 leading-snug">
              Google OAuth provider is not yet enabled in the Supabase project dashboard. You can sign in immediately using the test Google account below:
            </p>
            <button
              type="button"
              onClick={handleGoogleDemoLogin}
              disabled={loading}
              className="w-full py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-semibold text-[11px] rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Continue with Google (Demo Account)</span>
            </button>
          </div>
        )}

        {/* Toggle Mode Link */}
        <div className="text-center pt-2">
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            disabled={loading}
            className="text-[11px] text-spotify-green hover:underline cursor-pointer focus:outline-none"
          >
            {mode === 'signin'
              ? "Don't have an account? Sign Up"
              : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
export default AuthModal;
