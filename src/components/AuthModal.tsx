import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, RefreshCw, LogIn } from 'lucide-react';
import { auth, googleProvider } from '../firebase.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'signin' | 'signup';
  onAuthSuccess: (user: { name: string; role: string; email: string }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  mode: initialMode,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (mode === 'signup' && !name)) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === 'signin') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        onAuthSuccess({
          name: user.displayName || user.email?.split('@')[0] || 'User',
          role: 'Sustainability Lead',
          email: user.email || '',
        });
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        onAuthSuccess({
          name: name || user.email?.split('@')[0] || 'User',
          role: 'Sustainability Lead',
          email: user.email || '',
        });
      }
      onClose();
    } catch (err: any) {
      console.error('[AuthModal] Auth error:', err);
      // Clean up Firebase standard errors for user readability
      let friendlyMessage = err.message;
      if (err.code === 'auth/wrong-password') {
        friendlyMessage = 'Incorrect password. Please try again.';
      } else if (err.code === 'auth/user-not-found') {
        friendlyMessage = 'No account found with this email.';
      } else if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = 'An account already exists with this email.';
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyMessage = 'Please enter a valid email address.';
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      onAuthSuccess({
        name: user.displayName || 'Google User',
        role: 'Sustainability Lead',
        email: user.email || '',
      });
      onClose();
    } catch (err: any) {
      console.error('[AuthModal] Google Auth error:', err);
      setError(err.message || 'An error occurred during Google Sign-In.');
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
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-transparent hover:bg-mid-dark text-text-base border border-border-gray font-semibold text-xs py-2 rounded transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.2-5.136 4.2A5.626 5.626 0 0 1 8.35 12.98a5.626 5.626 0 0 1 5.64-5.625c2.42 0 4.303 1.05 5.23 1.955l3.245-3.21C20.35 4.14 17.433 2.76 13.99 2.76a10.22 10.22 0 0 0-10.23 10.22a10.22 10.22 0 0 0 10.23 10.22c5.96 0 10.37-4.22 10.37-10.51c0-.67-.06-1.12-.19-1.425z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

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
