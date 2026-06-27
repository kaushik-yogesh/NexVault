/**
 * NexVault — PermissionManager
 * 
 * Manages DApp permissions (connected sites) in the extension environment.
 * Ensures strict origin validation before responding to JSON-RPC requests.
 */

import store from '../vault/ExtensionStore.js';

class PermissionManager {
  /**
   * Check if a specific origin has been approved by the user
   * @param {string} origin - The requesting DApp origin (e.g. 'https://uniswap.org')
   * @returns {Promise<boolean>}
   */
  async hasPermission(origin) {
    if (!origin) return false;
    
    // Retrieve permissions from ExtensionStore (which maps `setting_permissions` -> obj)
    const permissions = await this.getAllPermissions();
    return !!permissions[origin];
  }

  /**
   * Get the details of an approved origin
   * @param {string} origin 
   * @returns {Promise<Object|null>} { connectedAt: number, accounts: string[] }
   */
  async getPermission(origin) {
    const permissions = await this.getAllPermissions();
    return permissions[origin] || null;
  }

  /**
   * Grant permission to an origin for specific accounts
   * @param {string} origin - The DApp origin
   * @param {string[]} accounts - List of approved account addresses
   * @returns {Promise<void>}
   */
  async grantPermission(origin, accounts) {
    const permissions = await this.getAllPermissions();
    
    permissions[origin] = {
      connectedAt: Date.now(),
      accounts: accounts.map(a => a.toLowerCase())
    };

    await store.setSetting('permissions', permissions);
  }

  /**
   * Revoke permission from an origin
   * @param {string} origin 
   * @returns {Promise<void>}
   */
  async revokePermission(origin) {
    const permissions = await this.getAllPermissions();
    
    if (permissions[origin]) {
      delete permissions[origin];
      await store.setSetting('permissions', permissions);
    }
  }

  /**
   * Get all granted permissions
   * @returns {Promise<Object>} Map of origin -> permission data
   */
  async getAllPermissions() {
    const data = await store.getSetting('permissions');
    return data || {};
  }
}

const permissionManager = new PermissionManager();
export default permissionManager;
