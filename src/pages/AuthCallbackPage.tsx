import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkOSAuth } from '../lib/auth-helpers';

/**
 * This page handles the WorkOS OAuth callback.
 * The auth-helpers provider automatically detects the `code` query param
 * and exchanges it for a token. This page just shows a loading state.
 */
export function AuthCallbackPage() {
  const { isLoading, authError, signIn, user, accessToken } = useWorkOSAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user && accessToken) {
      navigate('/', { replace: true });
    }
  }, [isLoading, user, accessToken, navigate]);

  if (authError) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-rose-400 mb-2">Sign-in failed</p>
        <p className="text-xs text-zinc-500 max-w-md mb-4">{authError}</p>
        <button
          onClick={signIn}
          className="px-3 py-1.5 text-xs bg-white text-black rounded font-medium hover:bg-zinc-200 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!isLoading && !user && !accessToken) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-zinc-300 mb-2">Sign-in did not complete</p>
        <p className="text-xs text-zinc-500 max-w-md mb-4">We did not receive a valid authenticated session from WorkOS.</p>
        <button
          onClick={signIn}
          className="px-3 py-1.5 text-xs bg-white text-black rounded font-medium hover:bg-zinc-200 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center">
      <Loader2 className="w-6 h-6 text-zinc-600 animate-spin mb-3" />
      <p className="text-sm text-zinc-500">{isLoading ? 'Signing you in...' : 'Finishing sign-in...'}</p>
    </div>
  );
}
