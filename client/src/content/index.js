/**
 * NexVault — Content Script
 * 
 * Injected into web pages to provide window.ethereum compatibility.
 * Bridges communication between DApps and the extension background.
 */

// Inject the provider script into the page context
function injectProvider() {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('src/content/injectProvider.js');
    script.type = 'module';
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  } catch (err) {
    console.error('[NexVault] Failed to inject provider:', err);
  }
}

injectProvider();

// Bridge messages between page and background
window.addEventListener('message', async (event) => {
  // Only accept messages from the same page
  if (event.source !== window) return;
  if (event.data?.target !== 'nexvault-contentscript') return;

  const { id, method, params } = event.data;

  try {
    // Sanitize payload to prevent Prototype Pollution
    const sanitizedMethod = String(method);
    const sanitizedParams = params ? JSON.parse(JSON.stringify(params)) : [];

    // Forward to background service worker
    const response = await chrome.runtime.sendMessage({
      type: 'msg:providerRequest',
      payload: { method: sanitizedMethod, params: sanitizedParams },
    });

    // Send response back to page
    window.postMessage({
      target: 'nexvault-inpage',
      id,
      ...response,
    }, '*');
  } catch (err) {
    window.postMessage({
      target: 'nexvault-inpage',
      id,
      error: err.message,
    }, '*');
  }
});

// Listen for events from background (account/chain changes)
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'msg:accountChanged') {
    window.postMessage({
      target: 'nexvault-inpage',
      event: 'accountsChanged',
      data: message.accounts,
    }, '*');
  }

  if (message.type === 'msg:chainChanged') {
    window.postMessage({
      target: 'nexvault-inpage',
      event: 'chainChanged',
      data: message.chainId,
    }, '*');
  }
});
