/**
 * NexVault — API Endpoint Constants
 */

export const ENDPOINTS = {
  // Auth (SIWE)
  AUTH: {
    NONCE: '/auth/nonce',
    VERIFY: '/auth/verify',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
  },
  
  // Chains
  CHAINS: {
    LIST: '/chains',
    GET: (id) => `/chains/${id}`,
  },
  
  // Contacts (Address Book)
  CONTACTS: {
    LIST: '/contacts',
    CREATE: '/contacts',
    UPDATE: (id) => `/contacts/${id}`,
    DELETE: (id) => `/contacts/${id}`,
  },
  
  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: (id) => `/notifications/${id}/read`,
  },
};
