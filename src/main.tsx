import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { Toaster } from 'react-hot-toast';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster position="bottom-right" toastOptions={{
      style: { background: '#111', color: '#fff', border: '1px solid #222', borderRadius: '0' }
    }} />
  </StrictMode>
);
