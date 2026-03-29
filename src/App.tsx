import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useConvexAuth, useMutation } from 'convex/react';
import { Analytics } from '@vercel/analytics/react';
import { api } from '../convex/_generated/api';
import { useEffect } from 'react';
import { useWorkOSAuth } from './lib/auth-helpers';
import { AppProvider } from './lib/app-store';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { UploadPage } from './pages/UploadPage';
import { DashboardListPage } from './pages/DashboardListPage';
import { DashboardViewPage } from './pages/DashboardViewPage';
import { PreviewPage } from './pages/PreviewPage';
import { DataSourcesPage } from './pages/DataSourcesPage';
import { DatasetDetailPage } from './pages/DatasetDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { ChatPage } from './pages/ChatPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { Loader2 } from 'lucide-react';

function AuthenticatedApp() {
  const getOrCreateUser = useMutation(api.users.getOrCreate);
  const { user, accessToken, signOut } = useWorkOSAuth();
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const workosConfigured = !!import.meta.env.VITE_WORKOS_CLIENT_ID;

  useEffect(() => {
    // Only sync once Convex actually has a token to send.
    if (workosConfigured && user && accessToken && isConvexAuthenticated) {
      getOrCreateUser().catch((error) => {
        if (error instanceof Error && error.message.includes('Not authenticated')) {
          signOut();
        }
      });
    }
  }, [getOrCreateUser, workosConfigured, user, accessToken, isConvexAuthenticated, signOut]);

  return (
    <AppProvider>
      <>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/preview/:id" element={<PreviewPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          <Route element={<AppLayout />}>
            <Route path="/dashboards" element={<DashboardListPage />} />
            <Route path="/dashboard/:id" element={<DashboardViewPage />} />
            <Route path="/data" element={<DataSourcesPage />} />
            <Route path="/data/:id" element={<DatasetDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:datasetId" element={<ChatPage />} />
          </Route>
        </Routes>
        <Analytics />
      </>
    </AppProvider>
  );
}

function App() {
  const { user, accessToken, isLoading } = useWorkOSAuth();
  const workosConfigured = !!import.meta.env.VITE_WORKOS_CLIENT_ID;
  const isAuthenticated = !!user && !!accessToken;

  if (workosConfigured && isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
      </div>
    );
  }

  if (workosConfigured && !isAuthenticated) {
    return (
      <BrowserRouter>
        <AppProvider>
          <>
            <Routes>
              <Route path="/" element={<UploadPage />} />
              <Route path="/preview/:id" element={<PreviewPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="*" element={<LoginPage />} />
            </Routes>
            <Analytics />
          </>
        </AppProvider>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <AuthenticatedApp />
    </BrowserRouter>
  );
}

export default App;
