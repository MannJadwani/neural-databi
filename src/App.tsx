import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './lib/app-store';
import { AppLayout } from './layouts/AppLayout';
import { DashboardListPage } from './pages/DashboardListPage';
import { DashboardViewPage } from './pages/DashboardViewPage';
import { DataSourcesPage } from './pages/DataSourcesPage';
import { DatasetDetailPage } from './pages/DatasetDetailPage';

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardListPage />} />
            <Route path="/dashboard/:id" element={<DashboardViewPage />} />
            <Route path="/data" element={<DataSourcesPage />} />
            <Route path="/data/:id" element={<DatasetDetailPage />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
