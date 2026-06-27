/**
 * NexVault — RequestManager
 * 
 * Queues DApp requests in the background script.
 * Keeps the Promise resolver/rejector in memory so the popup UI
 * can fulfill them asynchronously after user interaction.
 */

class RequestManager {
  constructor() {
    this.pendingRequests = new Map();
  }

  /**
   * Add a new request to the queue and return its unique ID
   */
  addRequest(method, params, sender) {
    const id = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, {
        id,
        method,
        params,
        sender,
        resolve,
        reject,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Get request details for the popup UI to display
   */
  getRequest(id) {
    const req = this.pendingRequests.get(id);
    if (!req) return null;
    return {
      id: req.id,
      method: req.method,
      params: req.params,
      origin: req.sender?.origin,
    };
  }

  /**
   * Resolve a pending request with a successful result
   */
  resolveRequest(id, result) {
    const req = this.pendingRequests.get(id);
    if (req) {
      req.resolve({ result });
      this.pendingRequests.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Reject a pending request with an error
   */
  rejectRequest(id, errorMessage) {
    const req = this.pendingRequests.get(id);
    if (req) {
      req.reject(new Error(errorMessage));
      this.pendingRequests.delete(id);
      return true;
    }
    return false;
  }
}

const requestManager = new RequestManager();
export default requestManager;
