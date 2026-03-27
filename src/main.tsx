import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexProviderWithAuth, ConvexReactClient } from 'convex/react';
import './index.css';
import App from './App';
import { Toaster } from 'react-hot-toast';
import { WorkOSAuthProvider, useAuthToken } from './lib/auth-helpers';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

function ConvexWithAuth({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useAuthToken}>
      {children}
    </ConvexProviderWithAuth>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WorkOSAuthProvider>
      <ConvexWithAuth>
        <App />
        <Toaster position="bottom-right" toastOptions={{
          style: { background: '#111', color: '#fff', border: '1px solid #222', borderRadius: '0' }
        }} />
      </ConvexWithAuth>
    </WorkOSAuthProvider>
  </StrictMode>
);
