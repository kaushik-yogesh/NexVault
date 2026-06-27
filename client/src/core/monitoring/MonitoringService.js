/**
 * NexVault — MonitoringService
 * 
 * Centralized logging and error tracking using Sentry and a custom logger.
 * For production, Sentry captures unhandled errors and promises.
 */

import * as Sentry from "@sentry/react";

class MonitoringService {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize Sentry for React + Browser Extension
   */
  init() {
    if (this.isInitialized) return;

    // Only init if DSN is provided (protects dev environment from spamming Sentry)
    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (dsn) {
      Sentry.init({
        dsn,
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration(),
        ],
        // Tracing
        tracesSampleRate: 1.0, 
        // Session Replay
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
      });
      console.log('[Monitoring] Sentry Initialized');
    }
    
    this.isInitialized = true;
  }

  info(message, context = {}) {
    console.log(`[INFO] ${message}`, context);
    if (this.isInitialized && import.meta.env.PROD) {
      Sentry.addBreadcrumb({
        category: 'info',
        message,
        level: 'info',
        data: context
      });
    }
  }

  warn(message, error = null) {
    console.warn(`[WARN] ${message}`, error);
    if (this.isInitialized && import.meta.env.PROD) {
      Sentry.captureMessage(message, 'warning');
      if (error) {
        Sentry.captureException(error);
      }
    }
  }

  error(message, error) {
    console.error(`[ERROR] ${message}`, error);
    if (this.isInitialized) {
      Sentry.withScope((scope) => {
        scope.setExtra('context', message);
        Sentry.captureException(error);
      });
    }
  }
}

const monitoringService = new MonitoringService();
export default monitoringService;
