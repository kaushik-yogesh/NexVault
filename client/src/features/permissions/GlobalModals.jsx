/**
 * NexVault — Global Modals
 * Renders WalletConnect prompts globally.
 */

import React from 'react';
import { useWalletConnect } from './hooks/useWalletConnect.js';
import ConnectModal from './components/ConnectModal.jsx';
import SignModal from './components/SignModal.jsx';
import TransactionPrompt from './components/TransactionPrompt.jsx';
import SwitchNetworkModal from './components/SwitchNetworkModal.jsx';
import { useProviderRequest } from './hooks/useProviderRequest.js';

export default function GlobalModals() {
  const {
    sessionProposal,
    approveProposal,
    rejectProposal,
    sessionRequest,
    respondToRequest,
    clearRequest,
  } = useWalletConnect();

  // Convert WC proposal to format expected by ConnectModal
  const connectRequest = sessionProposal ? {
    origin: sessionProposal.params.proposer.metadata.url,
    metadata: sessionProposal.params.proposer.metadata,
  } : null;

  // Integrate Provider Requests (EIP-1193 DApps)
  const { providerRequest, resolveProviderRequest, rejectProviderRequest } = useProviderRequest();
  
  const isProviderConnect = providerRequest?.method === 'eth_requestAccounts';
  const isProviderSign = providerRequest && providerRequest.method.includes('sign');
  const isProviderTx = providerRequest && providerRequest.method === 'eth_sendTransaction';
  const isProviderSwitch = providerRequest && providerRequest.method === 'wallet_switchEthereumChain';

  // Extract signing/transaction requests
  const isSignRequest = sessionRequest && sessionRequest.event.params.request.method.includes('sign');
  const isTxRequest = sessionRequest && sessionRequest.event.params.request.method === 'eth_sendTransaction';
  const isSwitchRequest = sessionRequest && sessionRequest.event.params.request.method === 'wallet_switchEthereumChain';
  
  let actionRequest = null;
  if (sessionRequest) {
    const { params } = sessionRequest.event;
    actionRequest = {
      origin: sessionRequest.session.peer.metadata.url,
      metadata: sessionRequest.session.peer.metadata,
      method: params.request.method,
      params: params.request.params,
    };
  }

  return (
    <>
      <ConnectModal
        isOpen={!!sessionProposal || isProviderConnect}
        request={sessionProposal ? connectRequest : (isProviderConnect ? providerRequest : null)}
        onApprove={sessionProposal ? approveProposal : resolveProviderRequest}
        onReject={sessionProposal ? rejectProposal : rejectProviderRequest}
      />
      
      <SignModal
        isOpen={!!isSignRequest || isProviderSign}
        request={isSignRequest ? actionRequest : (isProviderSign ? providerRequest : null)}
        onApprove={(signature) => sessionRequest ? respondToRequest(signature) : resolveProviderRequest(signature)}
        onReject={(err) => sessionRequest ? respondToRequest(null, err) : rejectProviderRequest(err)}
      />

      <TransactionPrompt
        isOpen={!!isTxRequest || isProviderTx}
        request={isTxRequest ? actionRequest : (isProviderTx ? providerRequest : null)}
        onApprove={(txHash) => sessionRequest ? respondToRequest(txHash) : resolveProviderRequest(txHash)}
        onReject={(err) => sessionRequest ? respondToRequest(null, err) : rejectProviderRequest(err)}
      />

      <SwitchNetworkModal
        isOpen={!!isSwitchRequest || isProviderSwitch}
        request={isSwitchRequest ? actionRequest : (isProviderSwitch ? providerRequest : null)}
        onApprove={() => sessionRequest ? respondToRequest(null) : resolveProviderRequest(null)}
        onReject={(err) => sessionRequest ? respondToRequest(null, err) : rejectProviderRequest(err)}
      />
    </>
  );
}
