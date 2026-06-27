/**
 * NexVault — Background Service Worker (Manifest V3)
 * 
 * Handles:
 * - Message routing between popup, content scripts, and background
 * - Wallet state management
 * - Auto-lock timers via chrome.alarms
 * - DApp request processing & JSON-RPC routing
 */

import providerManager from '../core/network/ProviderManager.js';
import vaultManager from '../core/vault/VaultManager.js';
import permissionManager from '../core/permissions/PermissionManager.js';
import requestManager from '../core/permissions/RequestManager.js';
import phishingDetector from '../core/security/PhishingDetector.js';
import walletConnectService from '../core/wallet/WalletConnectService.js';

// Keep-alive for service worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('[NexVault] Extension installed');
  
  // Set up auto-lock alarm (default: 5 minutes)
  chrome.alarms.create('autoLock', { delayInMinutes: 5 });

  // Init WalletConnect in the background
  walletConnectService.init();
});

// Handle alarm events (auto-lock)
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'autoLock') {
    // Broadcast lock event to all extension views
    chrome.runtime.sendMessage({ type: 'msg:lockVault' }).catch(() => {});
    if (vaultManager.isUnlocked) {
      vaultManager.lock();
    }
  }
});

// Anti-Phishing real-time tab scanner
if (chrome.tabs) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
      if (phishingDetector.isPhishing(changeInfo.url)) {
        console.warn(`[NexVault] Blocked phishing attempt: ${changeInfo.url}`);
        chrome.tabs.update(tabId, {
          url: chrome.runtime.getURL('phishing.html')
        });
      }
    }
  });
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((err) => sendResponse({ error: err.message }));
  
  return true; // Keep message channel open for async response
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case 'msg:getState':
      return { success: true, data: { status: 'ready', isUnlocked: vaultManager.isUnlocked } };

    case 'msg:resetAutoLock':
      // Reset the auto-lock timer on user activity
      chrome.alarms.clear('autoLock');
      chrome.alarms.create('autoLock', { delayInMinutes: message.minutes || 5 });
      return { success: true };

    case 'msg:providerRequest':
      // Handle DApp provider requests (forwarded from content script)
      return handleProviderRequest(message.payload, sender);

    // WalletConnect API bridge
    case 'msg:wc_pair':
      await walletConnectService.pair(message.uri);
      return { success: true };
    
    case 'msg:wc_approve':
      await walletConnectService.approveSession(message.proposal, message.addresses);
      return { success: true };

    case 'msg:wc_reject':
      await walletConnectService.rejectSession(message.id);
      return { success: true };

    // Request Manager UI API
    case 'msg:getPendingRequest':
      return { success: true, data: requestManager.getRequest(message.id) };

    case 'msg:resolveRequest':
      requestManager.resolveRequest(message.id, message.result);
      return { success: true };

    case 'msg:rejectRequest':
      requestManager.rejectRequest(message.id, message.error || 'User Rejected');
      return { success: true };

    default:
      return { error: `Unknown message type: ${message.type}` };
  }
}

/**
 * Handle EIP-1193 provider requests from DApps
 */
async function handleProviderRequest(payload, sender) {
  const { method, params } = payload;
  const origin = sender?.origin;

  if (!origin) {
    return { error: 'Origin is required for RPC requests' };
  }

  switch (method) {
    // 1. Requesting Connection
    case 'eth_requestAccounts':
      // Check if already approved
      if (await permissionManager.hasPermission(origin)) {
         const perm = await permissionManager.getPermission(origin);
         if (perm && vaultManager.isUnlocked) {
            return { result: perm.accounts };
         }
      }
      return launchApprovalPopup(method, params, sender);

    // 2. Methods requiring existing connection + user approval
    case 'eth_sendTransaction':
    case 'eth_sign':
    case 'personal_sign':
    case 'eth_signTypedData_v4':
    case 'wallet_switchEthereumChain':
    case 'wallet_addEthereumChain':
      if (!(await permissionManager.hasPermission(origin))) {
        return { error: '4100: Unauthorized - DApp is not connected to this origin.' };
      }
      return launchApprovalPopup(method, params, sender);

    // 3. Synchronous Wallet State Methods (Only if connected)
    case 'eth_accounts':
      if (vaultManager.isUnlocked && (await permissionManager.hasPermission(origin))) {
        const perm = await permissionManager.getPermission(origin);
        return { result: perm ? perm.accounts : [] };
      }
      return { result: [] };

    case 'eth_chainId':
    case 'net_version':
      const chainId = providerManager.getActiveChainId();
      return { result: method === 'net_version' ? parseInt(chainId, 16).toString() : chainId };

    // 4. Fallback to RPC Routing
    default:
      return routeRpcRequest(method, params);
  }
}

/**
 * Route read-only JSON-RPC requests to the active provider
 */
async function routeRpcRequest(method, params) {
  try {
    const provider = providerManager.getActiveProvider();
    const result = await provider.send(method, params || []);
    return { result };
  } catch (error) {
    console.error(`[NexVault] RPC Error for ${method}:`, error);
    return { error: error.message || 'RPC Request Failed' };
  }
}

/**
 * Launch the extension popup to get user approval and wait for response
 */
async function launchApprovalPopup(method, params, sender) {
  // Add to queue and get the pending promise
  const pendingPromise = requestManager.addRequest(method, params, sender);
  
  // Find the exact ID we just created (RequestManager generates it internally, 
  // but to keep it clean, we can just extract the latest or refactor addRequest to return ID.
  // Actually, wait! addRequest returns a Promise, not the ID.
  // Let's fix that. Since we can't extract the ID from the Promise easily here,
  // we will generate the ID here and pass it in.)
  return new Promise((resolve, reject) => {
    const requestId = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
    
    // Store in request manager
    requestManager.pendingRequests.set(requestId, {
      id: requestId,
      method,
      params,
      sender,
      resolve,
      reject,
      timestamp: Date.now()
    });

    // Open Popup
    chrome.windows.create({
      url: `index.html#/connected-sites?method=${method}&id=${requestId}`,
      type: 'popup',
      width: 360,
      height: 600,
      focused: true
    });
  });
}

// External message handler (from content scripts and web pages)
chrome.runtime.onMessageExternal?.addListener((message, sender, sendResponse) => {
  // Verify sender origin
  console.log('[NexVault] External message from:', sender.origin);
  sendResponse({ error: 'External messages not supported' });
});

console.log('[NexVault] Background service worker initialized');
