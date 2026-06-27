/**
 * NexVault — WalletConnect v2 Service
 * 
 * Manages the Web3Wallet instance and events.
 */

import { Core } from '@walletconnect/core';
import { Web3Wallet } from '@walletconnect/web3wallet';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';
import permissionManager from '../permissions/PermissionManager.js';
import providerManager from '../network/ProviderManager.js';
import store from '../vault/ExtensionStore.js';

// Custom Storage Adapter for WalletConnect using chrome.storage.local
const extensionStorageAdapter = {
  async getKeys() {
    const data = await store.getSetting('wc_storage') || {};
    return Object.keys(data);
  },
  async getEntries() {
    const data = await store.getSetting('wc_storage') || {};
    return Object.entries(data);
  },
  async getItem(key) {
    const data = await store.getSetting('wc_storage') || {};
    return data[key];
  },
  async setItem(key, value) {
    const data = await store.getSetting('wc_storage') || {};
    data[key] = value;
    await store.setSetting('wc_storage', data);
  },
  async removeItem(key) {
    const data = await store.getSetting('wc_storage') || {};
    delete data[key];
    await store.setSetting('wc_storage', data);
  }
};

class WalletConnectService {
  constructor() {
    this.core = null;
    this.web3wallet = null;
    this.isInitialized = false;
    
    // Callbacks for UI integration
    this.onSessionProposal = null;
    this.onSessionRequest = null;
    this.onSessionDelete = null;
  }

  /**
   * Initialize WalletConnect
   */
  async init() {
    if (this.isInitialized) return;

    try {
      this.core = new Core({
        projectId: 'b0a03d09a7e8bbf5e0a6e0f80bc64dc4', // Example public projectId
        storage: extensionStorageAdapter,
      });

      this.web3wallet = await Web3Wallet.init({
        core: this.core,
        metadata: {
          name: 'NexVault',
          description: 'Non-custodial, multi-chain crypto wallet',
          url: window.location.origin,
          icons: [`${window.location.origin}/nexvault-logo.png`],
        },
      });

      this._setupEventListeners();
      this.isInitialized = true;
      console.log('WalletConnect Initialized');
    } catch (err) {
      console.error('Failed to initialize WalletConnect', err);
    }
  }

  _setupEventListeners() {
    this.web3wallet.on('session_proposal', async (proposal) => {
      console.log('Session Proposal', proposal);
      // Broadcast to UI
      try {
        chrome.runtime.sendMessage({ type: 'wc_session_proposal', proposal }).catch(() => {});
      } catch (e) {
        // UI might be closed, auto-reject
        await this.web3wallet.rejectSession({
          id: proposal.id,
          reason: getSdkError('USER_REJECTED_METHODS'),
        });
      }
    });

    this.web3wallet.on('session_request', async (requestEvent) => {
      console.log('Session Request', requestEvent);
      
      const { topic, params, id } = requestEvent;
      const { request, chainId } = params;

      // Ensure session is permitted
      const session = this.web3wallet.getActiveSessions()[topic];
      if (!session) {
        await this.web3wallet.respondSessionRequest({
          topic,
          response: { id, error: getSdkError('UNAUTHORIZED_TARGET_CHAIN'), jsonrpc: '2.0' }
        });
        return;
      }

      // Broadcast to UI
      try {
        chrome.runtime.sendMessage({ type: 'wc_session_request', event: requestEvent, session }).catch(() => {});
      } catch (e) {
        // Auto-reject if UI not available to approve
        await this.web3wallet.respondSessionRequest({
          topic,
          response: { id, error: getSdkError('USER_REJECTED_METHODS'), jsonrpc: '2.0' }
        });
      }
    });

    this.web3wallet.on('session_delete', (event) => {
      console.log('Session Delete', event);
      try {
        chrome.runtime.sendMessage({ type: 'wc_session_delete', event }).catch(() => {});
      } catch(e) {}
    });
  }

  /**
   * Pair with a DApp via URI
   */
  async pair(uri) {
    if (!this.isInitialized) await this.init();
    await this.core.pairing.pair({ uri });
  }

  /**
   * Approve a session proposal
   */
  async approveSession(proposal, approvedAddresses) {
    const { id, params } = proposal;
    
    // Construct namespaces
    const supportedNamespaces = {
      eip155: {
        chains: ['eip155:1', 'eip155:56', 'eip155:137'], // Supported chains
        methods: ['eth_sendTransaction', 'personal_sign', 'eth_signTypedData', 'eth_signTypedData_v4'],
        events: ['accountsChanged', 'chainChanged'],
        accounts: approvedAddresses.flatMap(addr => [
          `eip155:1:${addr}`,
          `eip155:56:${addr}`,
          `eip155:137:${addr}`
        ])
      }
    };

    const approvedNamespaces = buildApprovedNamespaces({
      proposal: params,
      supportedNamespaces
    });

    const session = await this.web3wallet.approveSession({
      id,
      namespaces: approvedNamespaces
    });
    
    // Save permission locally
    const origin = params.proposer.metadata.url;
    for (const addr of approvedAddresses) {
      await permissionManager.grantPermission(origin, addr, params.proposer.metadata);
    }

    return session;
  }

  /**
   * Reject a session proposal
   */
  async rejectSession(proposalId) {
    await this.web3wallet.rejectSession({
      id: proposalId,
      reason: getSdkError('USER_REJECTED_METHODS'),
    });
  }

  /**
   * Disconnect an active session
   */
  async disconnectSession(topic) {
    await this.web3wallet.disconnectSession({
      topic,
      reason: getSdkError('USER_DISCONNECTED'),
    });
  }

  /**
   * Respond to a session request
   */
  async respondToRequest(topic, id, result, error = null) {
    const response = error 
      ? { id, error: getSdkError('USER_REJECTED_METHODS'), jsonrpc: '2.0' }
      : { id, result, jsonrpc: '2.0' };
      
    await this.web3wallet.respondSessionRequest({
      topic,
      response
    });
  }
}

const walletConnectService = new WalletConnectService();
export default walletConnectService;
