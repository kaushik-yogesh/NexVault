/**
 * NexVault — Redux Analytics Middleware
 * 
 * Tracks important wallet events for internal telemetry (opt-in).
 * No sensitive data is ever tracked.
 */

const analyticsMiddleware = (store) => (next) => (action) => {
  // Execute the action first
  const result = next(action);

  // Read current state
  const state = store.getState();
  const { hasBackedUp } = state.settings;

  // Track specific events (fire and forget)
  try {
    switch (action.type) {
      case 'wallet/create/fulfilled':
        console.log('[Analytics] Wallet Created');
        break;

      case 'wallet/importSeed/fulfilled':
      case 'wallet/importKey/fulfilled':
        console.log('[Analytics] Wallet Imported');
        break;

      case 'settings/markBackedUp':
        console.log('[Analytics] User backed up recovery phrase');
        break;

      case 'network/switchNetwork':
        console.log(`[Analytics] Switched network to ${action.payload}`);
        break;
        
      default:
        break;
    }
  } catch (error) {
    // Analytics should never crash the app
    console.error('Analytics error:', error);
  }

  return result;
};

export default analyticsMiddleware;
