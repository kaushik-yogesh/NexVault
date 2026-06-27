/**
 * NexVault — Root Application Component
 */

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppRouter from './router/AppRouter.jsx';
import { bootWallet } from './features/wallet/walletSlice.js';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught React Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', backgroundColor: 'black', height: '100vh', overflow: 'auto' }}>
          <h2>Something went wrong.</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error && this.state.error.toString()}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '10px' }}>{this.state.error && this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const dispatch = useDispatch();
  const theme = useSelector((state) => state.settings.theme);

  // Boot wallet on mount
  useEffect(() => {
    dispatch(bootWallet());
  }, [dispatch]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  return (
    <div className="fixed inset-0 bg-surface-950 flex justify-center items-center sm:p-4 md:p-8">
      <div className="w-full h-full sm:max-h-[720px] sm:w-[400px] sm:rounded-[2rem] sm:shadow-2xl overflow-hidden relative border-surface-800 sm:border ring-1 ring-white/5 bg-surface-950">
        <HashRouter>
          <div className="absolute inset-0 bg-surface-950 dark:bg-surface-950 overflow-hidden">
            {/* Ambient background gradient */}
            <div className="absolute inset-0 gradient-mesh opacity-40 pointer-events-none" />
            
            {/* Main content */}
            <div className="absolute inset-0 z-10 overflow-hidden">
              <ErrorBoundary>
                <AppRouter />
              </ErrorBoundary>
            </div>

            {/* Toast notifications */}
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#1e293b',
                  color: '#f1f5f9',
                  border: '1px solid rgba(51, 65, 85, 0.5)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  padding: '12px 16px',
                },
                success: {
                  iconTheme: { primary: '#10b981', secondary: '#f1f5f9' },
                },
                error: {
                  iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' },
                },
              }}
            />
          </div>
        </HashRouter>
      </div>
    </div>
  );
}
