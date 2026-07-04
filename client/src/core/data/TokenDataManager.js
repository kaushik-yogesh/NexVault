import providerManager from '../network/ProviderManager.js';
import { getTokenPrices, getNativePrice } from '../api/pricingService.js';
import { setBalances } from '../../features/wallet/walletSlice.js';
import { setPrices, setPricingLoading } from '../../features/portfolio/pricingSlice.js';
import { selectTokensByChain } from '../../features/tokens/tokensSlice.js';
import { getAllChains } from '../../../../shared/constants/chains.js';

class TokenDataManager {
  constructor() {
    this.store = null;
    this.pollingInterval = null;
    this.isPolling = false;
  }

  initialize(store) {
    this.store = store;
    
    // Listen for account switches to trigger instant data refresh
    let currentAddress = store.getState().wallet.activeAddress;
    store.subscribe(() => {
      const newAddress = store.getState().wallet.activeAddress;
      if (newAddress && newAddress !== currentAddress) {
        currentAddress = newAddress;
        // Stop and restart polling to trigger an immediate fetch
        this.stopPolling();
        this.startPolling();
      }
    });

    this.startPolling();
  }

  startPolling() {
    if (this.isPolling) return;
    this.isPolling = true;
    
    // Initial fetch
    this.fetchAllData();

    // Poll every 30 seconds
    this.pollingInterval = setInterval(() => {
      this.fetchAllData();
    }, 30000);
  }

  stopPolling() {
    this.isPolling = false;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  async fetchAllData() {
    if (!this.store) return;
    
    const state = this.store.getState();
    const activeAddress = state.wallet.activeAddress;
    const activeChainId = state.network.activeChainId;
    
    if (!activeAddress) return;

    this.store.dispatch(setPricingLoading(true));

    try {
      const allChains = getAllChains();
      
      // 1. Prioritize Active Chain for snappy UX
      if (activeChainId) {
        await Promise.all([
          this.fetchBalances(activeAddress, activeChainId, state),
          this.fetchPrices(activeChainId, state)
        ]);
        // Remove loading state as soon as active chain is ready
        this.store.dispatch(setPricingLoading(false));
      }

      // 2. Fetch the rest of the chains in the background
      const backgroundChains = allChains.filter(c => c.chainId !== activeChainId);
      const promises = [];
      for (const chain of backgroundChains) {
        promises.push(this.fetchBalances(activeAddress, chain.chainId, state));
        promises.push(this.fetchPrices(chain.chainId, state));
      }
      
      // We don't need to await this for the UI to feel responsive,
      // but awaiting ensures we don't start another polling cycle before this finishes.
      await Promise.allSettled(promises);
    } catch (e) {
      console.warn('TokenDataManager sync failed:', e);
    } finally {
      this.store.dispatch(setPricingLoading(false));
    }
  }

  async fetchBalances(address, chainId, state) {
    try {
      const tokens = selectTokensByChain(state, chainId);
      const tokenAddresses = tokens.map(t => t.address).filter(a => a !== 'native');

      let nativeBalance = '0';
      const tokenBalances = {};

      // 1. Get native balance
      try {
        nativeBalance = await providerManager.getBalance(address, chainId);
      } catch (e) {
        console.warn('Failed to fetch native balance', e);
      }

      // 2. Get ERC20 balances using Multicall3
      const erc20Tokens = tokens.filter(t => t.address !== 'native');
      if (erc20Tokens.length > 0) {
        try {
          const balances = await providerManager.getMultipleTokenBalances(address, erc20Tokens, chainId);
          erc20Tokens.forEach((token, index) => {
            tokenBalances[token.address.toLowerCase()] = balances[index];
          });
        } catch (e) {
          console.warn('Fallback failed completely', e);
        }
      }

      this.store.dispatch(setBalances({
        address,
        chainId,
        balances: {
          native: nativeBalance,
          tokens: tokenBalances
        }
      }));

    } catch (e) {
      console.warn('Error in fetchBalances:', e);
    }
  }

  async fetchPrices(chainId, state) {
    try {
      const tokens = selectTokensByChain(state, chainId);
      const tokenAddresses = tokens.map(t => t.address).filter(a => a !== 'native');

      const [nativePriceData, tokenPricesData] = await Promise.all([
        getNativePrice(chainId),
        getTokenPrices(chainId, tokenAddresses)
      ]);

      const data = {
        'native': nativePriceData,
        ...tokenPricesData
      };

      this.store.dispatch(setPrices({ chainId, data }));
    } catch (e) {
      console.warn('Error in fetchPrices:', e);
    }
  }
}

const tokenDataManager = new TokenDataManager();
export default tokenDataManager;
