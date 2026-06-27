/**
 * NexVault — WalletConnect React Hook
 * 
 * Bridges WalletConnectService events to React state and Redux,
 * so modals can be shown globally.
 */

import { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
export function useWalletConnect() {
  const [sessionProposal, setSessionProposal] = useState(null);
  const [sessionRequest, setSessionRequest] = useState(null);
  const dispatch = useDispatch();

  useEffect(() => {
    // Listen for messages from background script about WC events
    const listener = (message) => {
      if (message.type === 'wc_session_proposal') {
        setSessionProposal(message.proposal);
      }
      if (message.type === 'wc_session_request') {
        setSessionRequest({ event: message.event, session: message.session });
      }
    };
    
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(listener);
    }
    return () => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.removeListener(listener);
      }
    };
  }, []);

  const pair = useCallback(async (uri) => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'msg:wc_pair', uri }, (response) => {
        if (response?.error) reject(new Error(response.error));
        else resolve();
      });
    });
  }, []);

  const approveProposal = useCallback(async (addresses) => {
    if (!sessionProposal) return;
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'msg:wc_approve', proposal: sessionProposal, addresses }, (response) => {
        if (response?.error) reject(new Error(response.error));
        else {
          setSessionProposal(null);
          resolve(response.session);
        }
      });
    });
  }, [sessionProposal, dispatch]);

  const rejectProposal = useCallback(async () => {
    if (!sessionProposal) return;
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'msg:wc_reject', id: sessionProposal.id }, (response) => {
        if (response?.error) reject(new Error(response.error));
        else {
          setSessionProposal(null);
          resolve();
        }
      });
    });
  }, [sessionProposal]);

  const respondToRequest = useCallback(async (result, error = null) => {
    if (!sessionRequest) return;
    const { event } = sessionRequest;
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'msg:wc_respond', topic: event.topic, id: event.id, result, error }, (response) => {
        if (response?.error) reject(new Error(response.error));
        else {
          setSessionRequest(null);
          resolve();
        }
      });
    });
  }, [sessionRequest]);

  const clearRequest = useCallback(() => {
    setSessionRequest(null);
  }, []);

  return {
    pair,
    sessionProposal,
    approveProposal,
    rejectProposal,
    sessionRequest,
    respondToRequest,
    clearRequest,
  };
}
