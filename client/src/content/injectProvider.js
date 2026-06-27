/**
 * NexVault — Injected Provider (window.ethereum)
 * 
 * This script runs in the PAGE context (not extension context).
 * It provides an EIP-1193 compatible window.ethereum object and
 * supports EIP-6963 for Multi-Injected Provider Discovery.
 */

(function () {
  'use strict';

  if (window.ethereum?.isNexVault) return; // Already injected

  let requestId = 0;
  const pendingRequests = new Map();
  const eventListeners = {};

  const provider = {
    isMetaMask: true, // Compatibility — many DApps check this specifically
    isNexVault: true,
    selectedAddress: null,
    chainId: '0x1',
    networkVersion: '1',
    isConnected: () => true,

    /**
     * EIP-1193 request method
     */
    async request({ method, params = [] }) {
      return new Promise((resolve, reject) => {
        const id = ++requestId;

        pendingRequests.set(id, { resolve, reject });

        window.postMessage({
          target: 'nexvault-contentscript',
          id,
          method,
          params,
        }, '*');

        // Note: We deliberately removed the 30-second timeout here.
        // User approvals (like signing txs) may take longer if they are 
        // using a hardware wallet or reviewing details.
      });
    },

    /**
     * Legacy send method (deprecated but still used by some older DApps)
     */
    send(methodOrPayload, callbackOrParams) {
      if (typeof methodOrPayload === 'string') {
        return provider.request({
          method: methodOrPayload,
          params: callbackOrParams || [],
        });
      }

      if (typeof callbackOrParams === 'function') {
        provider
          .request(methodOrPayload)
          .then((result) => callbackOrParams(null, { result }))
          .catch((error) => callbackOrParams(error));
        return;
      }

      return provider.request(methodOrPayload);
    },

    /**
     * Legacy sendAsync method
     */
    sendAsync(payload, callback) {
      provider
        .request(payload)
        .then((result) => callback(null, { id: payload.id, jsonrpc: '2.0', result }))
        .catch((error) => callback(error));
    },

    /**
     * Legacy enable method
     */
    enable() {
      return provider.request({ method: 'eth_requestAccounts' });
    },

    /**
     * Event listener methods
     */
    on(event, listener) {
      if (!eventListeners[event]) eventListeners[event] = [];
      eventListeners[event].push(listener);
      return provider;
    },

    removeListener(event, listener) {
      if (!eventListeners[event]) return provider;
      eventListeners[event] = eventListeners[event].filter((l) => l !== listener);
      return provider;
    },

    removeAllListeners(event) {
      if (event) {
        delete eventListeners[event];
      } else {
        Object.keys(eventListeners).forEach((e) => delete eventListeners[e]);
      }
      return provider;
    },
  };

  // Listen for responses from content script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.target !== 'nexvault-inpage') return;

    // Handle RPC responses
    if (event.data.id && pendingRequests.has(event.data.id)) {
      const { resolve, reject } = pendingRequests.get(event.data.id);
      pendingRequests.delete(event.data.id);

      if (event.data.error) {
        reject(new Error(event.data.error));
      } else {
        resolve(event.data.result);
      }
    }

    // Handle events (e.g. accountsChanged, chainChanged)
    if (event.data.event) {
      const listeners = eventListeners[event.data.event] || [];
      listeners.forEach((listener) => {
        try {
          listener(event.data.data);
        } catch (err) {
          console.error('[NexVault] Event listener error:', err);
        }
      });
    }
  });

  // 1. Inject as window.ethereum
  try {
    Object.defineProperty(window, 'ethereum', {
      value: new Proxy(provider, {
        deleteProperty: () => true,
      }),
      writable: false,
      configurable: false,
    });
  } catch (err) {
    // If window.ethereum already exists, try to override or attach to it
    window.ethereum = provider;
  }
  
  // Legacy initialization event
  window.dispatchEvent(new Event('ethereum#initialized'));

  // 2. Announce Provider via EIP-6963
  const announceProvider = () => {
    const info = {
      uuid: 'nexvault-wallet-ext',
      name: 'NexVault',
      icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzFBMUExQSIvPjxwYXRoIGQ9Ik01MCAyMEw4MCA3MEgyMEw1MCAyMFoiIGZpbGw9IiM0Q0FGNTAiLz48L3N2Zz4=', // Simple fallback icon
      rdns: 'com.nexvault.extension'
    };

    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
      detail: Object.freeze({ info, provider })
    }));
  };

  window.addEventListener('eip6963:requestProvider', announceProvider);
  announceProvider();

})();
