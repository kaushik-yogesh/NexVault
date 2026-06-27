/**
 * NexVault — Application Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store, persistor } from './store/store.js';
import App from './App.jsx';
import monitoringService from './core/monitoring/MonitoringService.js';
import tokenDataManager from './core/data/TokenDataManager.js';
import * as Sentry from '@sentry/react';
import './index.css';

monitoringService.init();
tokenDataManager.initialize(store);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30 * 1000, // 30 seconds
      refetchOnWindowFocus: false,
    },
  },
});

// Detect if running as Chrome Extension popup
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
  document.documentElement.classList.add('is-extension');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <Sentry.ErrorBoundary fallback={<div style={{padding: '20px', color: 'red'}}>Critical Error: UI Crashed</div>}>
            <App />
          </Sentry.ErrorBoundary>
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);
