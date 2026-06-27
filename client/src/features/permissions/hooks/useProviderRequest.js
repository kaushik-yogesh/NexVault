import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

export function useProviderRequest() {
  const [providerRequest, setProviderRequest] = useState(null);
  const location = useLocation();

  useEffect(() => {
    // Parse query params from hash router (react-router v6 puts search in location.search)
    // Sometimes in HashRouter the search is part of the hash, e.g., #/page?id=123
    const searchString = location.search || location.hash?.split('?')[1] || '';
    const searchParams = new URLSearchParams(searchString);
    const id = searchParams.get('id');

    if (id && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      // Fetch pending request from background RequestManager
      chrome.runtime.sendMessage({ type: 'msg:getPendingRequest', id }, (response) => {
        if (response && response.success && response.data) {
          // Format it to match the structure expected by the modals
          // The background stores: { id, method, params, origin }
          setProviderRequest({
            id: response.data.id,
            method: response.data.method,
            params: response.data.params,
            origin: response.data.origin,
            metadata: {
              name: new URL(response.data.origin).hostname,
              url: response.data.origin,
            }
          });
        }
      });
    }
  }, [location]);

  const resolveProviderRequest = useCallback(async (result) => {
    if (!providerRequest) return;
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      await chrome.runtime.sendMessage({
        type: 'msg:resolveRequest',
        id: providerRequest.id,
        result
      });
    }
    setProviderRequest(null);
    window.close(); // Close the popup after resolving
  }, [providerRequest]);

  const rejectProviderRequest = useCallback(async (error) => {
    if (!providerRequest) return;
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      await chrome.runtime.sendMessage({
        type: 'msg:rejectRequest',
        id: providerRequest.id,
        error: error?.message || 'User Rejected'
      });
    }
    setProviderRequest(null);
    window.close(); // Close the popup after rejecting
  }, [providerRequest]);

  return {
    providerRequest,
    resolveProviderRequest,
    rejectProviderRequest
  };
}
