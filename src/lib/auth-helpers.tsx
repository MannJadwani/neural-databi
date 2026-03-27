import { useState, useEffect, useCallback, useMemo, createContext, useContext, type ReactNode } from 'react';

interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  accessToken: string | null;
  authError: string | null;
  signIn: () => void;
  signOut: () => void;
}

const STORAGE_KEY = 'neuralbi_auth';
const AuthContext = createContext<AuthState | null>(null);

// Module-level lock: auth codes are single-use, prevent StrictMode double-fire
let codeBeingExchanged: string | null = null;

/**
 * Custom WorkOS auth provider that handles the OAuth flow via our Convex HTTP proxy.
 * Flow: signIn → redirect to WorkOS → callback with code → exchange via Convex → store token
 */
export function WorkOSAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clientId = import.meta.env.VITE_WORKOS_CLIENT_ID;
  const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL;
  const redirectUri = import.meta.env.VITE_WORKOS_REDIRECT_URI || (window.location.origin + '/auth/callback');

  // On mount: check for stored session or handle callback
  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        // Skip if this exact code is already being exchanged (StrictMode guard)
        if (codeBeingExchanged === code) return;
        codeBeingExchanged = code;

        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);

        try {
          setAuthError(null);
          const res = await fetch(`${convexSiteUrl}/auth/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, redirectUri }),
          });

          if (res.ok) {
            const data = await res.json();
            const token = data.access_token;
            const workosUser = data.user;

            if (token && workosUser) {
              const authUser: AuthUser = {
                id: workosUser.id,
                email: workosUser.email,
                firstName: workosUser.first_name,
                lastName: workosUser.last_name,
                profilePictureUrl: workosUser.profile_picture_url,
              };

              setUser(authUser);
              setAccessToken(token);
              sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ user: authUser, token }));
            } else {
              setAuthError('No token received from WorkOS.');
            }
          } else {
            const body = await res.json().catch(() => null);
            const errorMessage = typeof body?.error === 'string'
              ? body.error
              : 'Authentication failed during callback.';
            setUser(null);
            setAccessToken(null);
            sessionStorage.removeItem(STORAGE_KEY);
            setAuthError(errorMessage);
          }
        } catch (err) {
          console.error('Auth callback failed:', err);
          setUser(null);
          setAccessToken(null);
          sessionStorage.removeItem(STORAGE_KEY);
          setAuthError(err instanceof Error ? err.message : 'Auth callback failed');
        } finally {
          codeBeingExchanged = null;
        }

        setIsLoading(false);
        return;
      }

      // Check stored session
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          const { user: storedUser, token } = JSON.parse(stored);
          if (storedUser && token) {
            setUser(storedUser);
            setAccessToken(token);
            setAuthError(null);
          } else {
            sessionStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch {}

      setIsLoading(false);
    };

    init();
  }, [convexSiteUrl]);

  const signIn = useCallback(() => {
    if (!clientId) return;
    setAuthError(null);
    const authUrl = `https://api.workos.com/user_management/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&provider=authkit`;
    window.location.href = authUrl;
  }, [clientId, redirectUri]);

  const signOut = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setAuthError(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, accessToken, authError, signIn, signOut }),
    [user, isLoading, accessToken, authError, signIn, signOut]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useWorkOSAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useWorkOSAuth must be inside WorkOSAuthProvider');
  return ctx;
}

/**
 * Bridge for Convex's useAuth — provides the token to ConvexProviderWithAuth.
 */
export function useAuthToken() {
  const { isLoading, user, accessToken } = useWorkOSAuth();

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      return accessToken;
    },
    [accessToken]
  );

  return useMemo(
    () => ({
      isLoading,
      isAuthenticated: !!user && !!accessToken,
      fetchAccessToken,
    }),
    [isLoading, user, accessToken, fetchAccessToken]
  );
}
