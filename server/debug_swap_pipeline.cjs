/**
 * Deep Forensic Debug: NexVault SDX → POL Pipeline (ethers v5)
 * 
 * Replicates EXACT NexVault pipeline and compares with MetaMask path.
 */

var ethers = require('ethers');
var axios = require('axios');

var SDX_ADDRESS = '0x6899fAcE15c14348E1759371049ab64A3a06bFA6';
var WALLET_ADDRESS = process.argv[2] || '0x12cf6e426c781bd3443c166968115859ba506f4a';
var SELL_AMOUNT = process.argv[3] || '1.5';

var POLYGON_RPC = 'https://polygon-bor-rpc.publicnode.com';
var NATIVE_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
var KYBER_BASE = 'https://aggregator-api.kyberswap.com/polygon/api/v1';

// NexVault's hardcoded defaults (from swap.controller.js)
var PLATFORM_FEE_BPS = 50; // 0.5% = 50 bps
var TREASURY_ADDRESS = '0x12cf6e426c781bd3443c166968115859ba506f4a';
var NEXVAULT_SLIPPAGE_BPS = 100; // 1% = 100 bps

async function main() {
  var provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC);
  
  console.log('='.repeat(80));
  console.log('DEEP FORENSIC DEBUG: NexVault SDEX -> POL Pipeline');
  console.log('='.repeat(80));
  console.log('');

  // === STEP 0: On-chain Decimals ===
  console.log('--- STEP 0: On-chain Decimals ---');
  var erc20 = new ethers.Contract(SDX_ADDRESS, [
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function name() view returns (string)',
    'function balanceOf(address) view returns (uint256)'
  ], provider);
  
  var decimals = await erc20.decimals();
  var symbol = await erc20.symbol().catch(function() { return 'UNKNOWN'; });
  var tokenName = await erc20.name().catch(function() { return 'UNKNOWN'; });
  
  console.log('  Token: ' + tokenName + ' (' + symbol + ')');
  console.log('  On-chain decimals: ' + decimals);
  console.log('');

  // === STEP 1: Amount Conversion ===
  console.log('--- STEP 1: Amount Conversion ---');
  var sellAmountWei = ethers.utils.parseUnits(SELL_AMOUNT, decimals).toString();
  console.log('  sellAmount: ' + SELL_AMOUNT);
  console.log('  decimals: ' + decimals);
  console.log('  sellAmountWei: ' + sellAmountWei);
  console.log('');

  // === STEP 2: Kyber /routes — NexVault (with fee) vs MetaMask (no fee) ===
  console.log('--- STEP 2: Kyber /routes ---');
  
  var nexvaultRouteUrl = KYBER_BASE + '/routes?tokenIn=' + SDX_ADDRESS.toLowerCase() + '&tokenOut=' + NATIVE_ADDRESS + '&amountIn=' + sellAmountWei + '&chargeFeeBy=currency_out&feeAmount=' + PLATFORM_FEE_BPS + '&feeReceiver=' + TREASURY_ADDRESS + '&isInBps=true';
  var metamaskRouteUrl = KYBER_BASE + '/routes?tokenIn=' + SDX_ADDRESS.toLowerCase() + '&tokenOut=' + NATIVE_ADDRESS + '&amountIn=' + sellAmountWei;
  
  console.log('  NexVault route URL:');
  console.log('    ' + nexvaultRouteUrl);
  console.log('  MetaMask route URL:');
  console.log('    ' + metamaskRouteUrl);
  console.log('');
  
  var nRouteRes, mRouteRes, nRouteSummary, mRouteSummary;
  
  try {
    nRouteRes = await axios.get(nexvaultRouteUrl);
    mRouteRes = await axios.get(metamaskRouteUrl);
    nRouteSummary = nRouteRes.data.data.routeSummary;
    mRouteSummary = mRouteRes.data.data.routeSummary;
  } catch (e) {
    console.log('  ROUTE FETCH ERROR: ' + (e.response ? JSON.stringify(e.response.data) : e.message));
    process.exit(1);
  }
  
  console.log('  NexVault routeSummary:');
  console.log('    amountIn:   ' + nRouteSummary.amountIn);
  console.log('    amountOut:  ' + nRouteSummary.amountOut);
  console.log('    gas:        ' + nRouteSummary.gas);
  console.log('    gasPrice:   ' + nRouteSummary.gasPrice);
  console.log('    extraFee:   ' + JSON.stringify(nRouteSummary.extraFee));
  console.log('');
  console.log('  MetaMask routeSummary:');
  console.log('    amountIn:   ' + mRouteSummary.amountIn);
  console.log('    amountOut:  ' + mRouteSummary.amountOut);
  console.log('    gas:        ' + mRouteSummary.gas);
  console.log('    gasPrice:   ' + mRouteSummary.gasPrice);
  console.log('    extraFee:   ' + JSON.stringify(mRouteSummary.extraFee));
  console.log('');
  console.log('  amountIn SAME?  ' + (nRouteSummary.amountIn === mRouteSummary.amountIn ? 'YES' : 'NO'));
  console.log('  amountOut SAME? ' + (nRouteSummary.amountOut === mRouteSummary.amountOut ? 'YES' : 'NO (expected — NexVault deducts 0.5% fee from output)'));
  console.log('');

  // === STEP 3: Kyber /route/build ===
  console.log('--- STEP 3: Kyber /route/build ---');
  
  var nBuildBody = {
    routeSummary: nRouteSummary,
    sender: WALLET_ADDRESS,
    recipient: WALLET_ADDRESS,
    slippageTolerance: NEXVAULT_SLIPPAGE_BPS
  };
  
  var mBuildBody = {
    routeSummary: mRouteSummary,
    sender: WALLET_ADDRESS,
    recipient: WALLET_ADDRESS,
    slippageTolerance: 200  // MetaMask-like 2%
  };
  
  var nBuildData, mBuildData;
  
  try {
    var nBuildRes = await axios.post(KYBER_BASE + '/route/build', nBuildBody);
    var mBuildRes = await axios.post(KYBER_BASE + '/route/build', mBuildBody);
    nBuildData = nBuildRes.data.data;
    mBuildData = mBuildRes.data.data;
  } catch (e) {
    console.log('  BUILD ERROR: ' + (e.response ? JSON.stringify(e.response.data) : e.message));
    process.exit(1);
  }
  
  console.log('  NexVault build:');
  console.log('    routerAddress: ' + nBuildData.routerAddress);
  console.log('    data length:   ' + (nBuildData.data ? nBuildData.data.length : 0));
  console.log('    data sig:      ' + (nBuildData.data ? nBuildData.data.substring(0, 10) : 'none'));
  console.log('');
  console.log('  MetaMask build:');
  console.log('    routerAddress: ' + mBuildData.routerAddress);
  console.log('    data length:   ' + (mBuildData.data ? mBuildData.data.length : 0));
  console.log('    data sig:      ' + (mBuildData.data ? mBuildData.data.substring(0, 10) : 'none'));
  console.log('');
  console.log('  routerAddress SAME? ' + (nBuildData.routerAddress === mBuildData.routerAddress ? 'YES' : 'NO'));
  console.log('');

  // === STEP 4: NexVault tx.value construction ===
  console.log('--- STEP 4: tx.value Construction (swap.controller.js line 129) ---');
  
  // From swap.controller.js: value: tokenIn === NATIVE_ADDRESS ? sellAmount : '0'
  // tokenIn for SDX = SDX_ADDRESS (not native), so value = '0'
  var tokenIn = SDX_ADDRESS.toLowerCase();
  var txValue = tokenIn === NATIVE_ADDRESS ? sellAmountWei : '0';
  
  console.log('  tokenIn: ' + tokenIn);
  console.log('  tokenIn === NATIVE_ADDRESS? ' + (tokenIn === NATIVE_ADDRESS));
  console.log('  tx.value: "' + txValue + '"');
  console.log('');

  // === STEP 5: Build exact NexVault and MetaMask txRequests ===
  console.log('--- STEP 5: Transaction Objects ---');
  
  var nexvaultTx = {
    to: nBuildData.routerAddress,
    data: nBuildData.data,
    value: txValue,
    from: WALLET_ADDRESS
  };
  
  var metamaskTx = {
    to: mBuildData.routerAddress,
    data: mBuildData.data,
    value: '0',
    from: WALLET_ADDRESS
  };
  
  console.log('  NexVault txRequest:');
  console.log('    to:    ' + nexvaultTx.to);
  console.log('    value: "' + nexvaultTx.value + '"');
  console.log('    from:  ' + nexvaultTx.from);
  console.log('    data:  ' + nexvaultTx.data.substring(0, 10) + '...' + nexvaultTx.data.substring(nexvaultTx.data.length - 10));
  console.log('');
  console.log('  MetaMask txRequest:');
  console.log('    to:    ' + metamaskTx.to);
  console.log('    value: "' + metamaskTx.value + '"');
  console.log('    from:  ' + metamaskTx.from);
  console.log('    data:  ' + metamaskTx.data.substring(0, 10) + '...' + metamaskTx.data.substring(metamaskTx.data.length - 10));
  console.log('');

  // === STEP 6: eth_call simulation ===
  console.log('--- STEP 6: eth_call Simulation ---');
  
  console.log('  [NexVault — 1% slippage + fee]');
  try {
    var result = await provider.call(nexvaultTx);
    console.log('  eth_call SUCCEEDED');
    console.log('  Return data (first 66): ' + result.substring(0, 66));
    try {
      var gas = await provider.estimateGas(nexvaultTx);
      console.log('  estimateGas SUCCEEDED: ' + gas.toString());
    } catch (ge) {
      console.log('  estimateGas FAILED: ' + (ge.reason || ge.message));
    }
  } catch (ce) {
    console.log('  eth_call FAILED');
    console.log('  reason:   ' + (ce.reason || 'none'));
    console.log('  code:     ' + (ce.code || 'none'));
    console.log('  message:  ' + (ce.message ? ce.message.substring(0, 300) : 'none'));
    if (ce.error && ce.error.message) {
      console.log('  rpc msg:  ' + ce.error.message);
    }
    if (ce.error && ce.error.data) {
      console.log('  rpc data: ' + ce.error.data);
    }
  }
  console.log('');
  
  console.log('  [MetaMask — 2% slippage, no fee]');
  try {
    var result2 = await provider.call(metamaskTx);
    console.log('  eth_call SUCCEEDED');
    console.log('  Return data (first 66): ' + result2.substring(0, 66));
    try {
      var gas2 = await provider.estimateGas(metamaskTx);
      console.log('  estimateGas SUCCEEDED: ' + gas2.toString());
    } catch (ge2) {
      console.log('  estimateGas FAILED: ' + (ge2.reason || ge2.message));
    }
  } catch (ce2) {
    console.log('  eth_call FAILED');
    console.log('  reason:  ' + (ce2.reason || 'none'));
    console.log('  message: ' + (ce2.message ? ce2.message.substring(0, 300) : 'none'));
  }
  console.log('');

  // === STEP 7: Isolate — NexVault route with NO fee ===
  console.log('--- STEP 7: NexVault route WITHOUT fee (isolating fee impact) ---');
  try {
    var noFeeRouteRes = await axios.get(metamaskRouteUrl);
    var noFeeRS = noFeeRouteRes.data.data.routeSummary;
    var noFeeBuildRes = await axios.post(KYBER_BASE + '/route/build', {
      routeSummary: noFeeRS,
      sender: WALLET_ADDRESS,
      recipient: WALLET_ADDRESS,
      slippageTolerance: NEXVAULT_SLIPPAGE_BPS  // Keep NexVault's 1%
    });
    var noFeeBD = noFeeBuildRes.data.data;
    
    try {
      await provider.call({ to: noFeeBD.routerAddress, data: noFeeBD.data, value: '0', from: WALLET_ADDRESS });
      console.log('  No fee + 1% slippage: eth_call SUCCEEDED');
    } catch (ce3) {
      console.log('  No fee + 1% slippage: eth_call FAILED: ' + (ce3.reason || ce3.message));
    }
  } catch (e3) {
    console.log('  Error: ' + e3.message);
  }
  console.log('');

  // === STEP 8: Isolate — NexVault route with fee but HIGHER slippage ===
  console.log('--- STEP 8: NexVault route WITH fee + HIGHER slippage ---');
  try {
    var highSlipBuildRes = await axios.post(KYBER_BASE + '/route/build', {
      routeSummary: nRouteSummary,
      sender: WALLET_ADDRESS,
      recipient: WALLET_ADDRESS,
      slippageTolerance: 500  // 5% slippage
    });
    var highSlipBD = highSlipBuildRes.data.data;
    
    try {
      await provider.call({ to: highSlipBD.routerAddress, data: highSlipBD.data, value: '0', from: WALLET_ADDRESS });
      console.log('  Fee + 5% slippage: eth_call SUCCEEDED');
    } catch (ce4) {
      console.log('  Fee + 5% slippage: eth_call FAILED: ' + (ce4.reason || ce4.message));
    }
  } catch (e4) {
    console.log('  Error: ' + e4.message);
  }
  console.log('');

  // === STEP 9: Rapid 5x test (intermittency check) ===
  console.log('--- STEP 9: Rapid 5x Intermittency Test (NexVault exact config) ---');
  for (var i = 0; i < 5; i++) {
    try {
      var freshRouteRes = await axios.get(nexvaultRouteUrl);
      var freshRS = freshRouteRes.data.data.routeSummary;
      var freshBuildRes = await axios.post(KYBER_BASE + '/route/build', {
        routeSummary: freshRS,
        sender: WALLET_ADDRESS,
        recipient: WALLET_ADDRESS,
        slippageTolerance: NEXVAULT_SLIPPAGE_BPS
      });
      var freshBD = freshBuildRes.data.data;
      
      try {
        await provider.call({ to: freshBD.routerAddress, data: freshBD.data, value: '0', from: WALLET_ADDRESS });
        console.log('  Run ' + (i+1) + ': eth_call SUCCEEDED');
      } catch (ce5) {
        var msg5 = ce5.reason || ce5.message || '';
        console.log('  Run ' + (i+1) + ': eth_call FAILED: ' + msg5.substring(0, 100));
      }
    } catch (e5) {
      console.log('  Run ' + (i+1) + ': Error: ' + e5.message);
    }
  }
  console.log('');

  // === FINAL TABLE ===
  console.log('='.repeat(80));
  console.log('FINAL COMPARISON TABLE');
  console.log('='.repeat(80));
  console.log('');
  console.log('Step                  | MetaMask                    | NexVault                     | Same?');
  console.log('----------------------|-----------------------------|------------------------------|------');
  console.log('Decimals              | ' + decimals + '                          | ' + decimals + '                           | YES');
  console.log('amountIn (wei)        | ' + sellAmountWei.substring(0,20) + '    | ' + sellAmountWei.substring(0,20) + '     | YES');
  console.log('Platform fee          | None                        | 50 bps (0.5%)                | NO');
  console.log('amountOut (route)     | ' + mRouteSummary.amountOut.substring(0,20) + ' | ' + nRouteSummary.amountOut.substring(0,20) + '  | ' + (mRouteSummary.amountOut === nRouteSummary.amountOut ? 'YES' : 'NO'));
  console.log('Slippage (bps)        | 200                         | ' + NEXVAULT_SLIPPAGE_BPS + '                          | NO');
  console.log('Router address        | ' + mBuildData.routerAddress.substring(0,15) + '... | ' + nBuildData.routerAddress.substring(0,15) + '...  | ' + (mBuildData.routerAddress === nBuildData.routerAddress ? 'YES' : 'NO'));
  console.log('tx.value              | 0                           | ' + txValue + '                            | YES');
  console.log('calldata sig          | ' + (mBuildData.data ? mBuildData.data.substring(0,10) : '?') + '                   | ' + (nBuildData.data ? nBuildData.data.substring(0,10) : '?') + '                    | ' + ((mBuildData.data || '').substring(0,10) === (nBuildData.data || '').substring(0,10) ? 'YES' : 'NO'));
  console.log('');
  console.log('DIAGNOSIS COMPLETE');
}

main().catch(function(err) {
  console.error('Fatal error:', err);
  process.exit(1);
});
