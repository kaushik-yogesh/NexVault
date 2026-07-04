/**
 * Decode and compare minReturnAmount in NexVault vs MetaMask calldata
 */

var ethers = require('ethers');
var axios = require('axios');

var SDX_ADDRESS = '0x6899fAcE15c14348E1759371049ab64A3a06bFA6';
var WALLET_ADDRESS = process.argv[2] || '0x12cf6e426c781bd3443c166968115859ba506f4a';
var SELL_AMOUNT = process.argv[3] || '1.5';
var NATIVE_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
var KYBER_BASE = 'https://aggregator-api.kyberswap.com/polygon/api/v1';
var PLATFORM_FEE_BPS = 50;
var TREASURY_ADDRESS = '0x12cf6e426c781bd3443c166968115859ba506f4a';

// Kyber swap function ABI
var SWAP_ABI = ['function swap(tuple(address,address,bytes,tuple(address,address,address[],uint256[],address[],uint256[],address,uint256,uint256,uint256,bytes),bytes))'];

async function main() {
  var sellAmountWei = ethers.utils.parseUnits(SELL_AMOUNT, 18).toString();
  
  // NexVault route (with fee)
  var nRouteUrl = KYBER_BASE + '/routes?tokenIn=' + SDX_ADDRESS.toLowerCase() + '&tokenOut=' + NATIVE_ADDRESS + '&amountIn=' + sellAmountWei + '&chargeFeeBy=currency_out&feeAmount=' + PLATFORM_FEE_BPS + '&feeReceiver=' + TREASURY_ADDRESS + '&isInBps=true';
  var nRouteRes = await axios.get(nRouteUrl);
  var nRS = nRouteRes.data.data.routeSummary;
  
  // MetaMask route (no fee)  
  var mRouteUrl = KYBER_BASE + '/routes?tokenIn=' + SDX_ADDRESS.toLowerCase() + '&tokenOut=' + NATIVE_ADDRESS + '&amountIn=' + sellAmountWei;
  var mRouteRes = await axios.get(mRouteUrl);
  var mRS = mRouteRes.data.data.routeSummary;
  
  // Build both
  var nBuild = await axios.post(KYBER_BASE + '/route/build', {
    routeSummary: nRS, sender: WALLET_ADDRESS, recipient: WALLET_ADDRESS, slippageTolerance: 100
  });
  var mBuild = await axios.post(KYBER_BASE + '/route/build', {
    routeSummary: mRS, sender: WALLET_ADDRESS, recipient: WALLET_ADDRESS, slippageTolerance: 200
  });
  
  var nData = nBuild.data.data;
  var mData = mBuild.data.data;
  
  // Decode calldata
  var iface = new ethers.utils.Interface(SWAP_ABI);
  
  var nDecoded = iface.parseTransaction({ data: nData.data });
  var mDecoded = iface.parseTransaction({ data: mData.data });
  
  // The tuple structure is:
  // (address executor, address desc_srcToken, bytes executorData, 
  //   (address srcToken, address dstToken, address[] srcReceivers, uint256[] srcAmounts, 
  //    address[] feeReceivers, uint256[] feeAmounts, address dstReceiver,
  //    uint256 amount, uint256 minReturnAmount, uint256 flags, bytes permit), bytes clientData)
  
  var nDesc = nDecoded.args[0][3]; // The desc tuple
  var mDesc = mDecoded.args[0][3];
  
  console.log('=== CALLDATA DECODED COMPARISON ===');
  console.log('');
  console.log('--- NexVault (1% slippage + 0.5% fee) ---');
  console.log('  srcToken:        ' + nDesc[0]);
  console.log('  dstToken:        ' + nDesc[1]);
  console.log('  srcReceivers:    ' + JSON.stringify(nDesc[2]));
  console.log('  srcAmounts:      ' + nDesc[3].map(function(x) { return x.toString(); }));
  console.log('  feeReceivers:    ' + JSON.stringify(nDesc[4]));
  console.log('  feeAmounts:      ' + nDesc[5].map(function(x) { return x.toString(); }));
  console.log('  dstReceiver:     ' + nDesc[6]);
  console.log('  amount:          ' + nDesc[7].toString());
  console.log('  minReturnAmount: ' + nDesc[8].toString());
  console.log('  flags:           ' + nDesc[9].toString());
  console.log('');
  console.log('--- MetaMask (2% slippage, no fee) ---');
  console.log('  srcToken:        ' + mDesc[0]);
  console.log('  dstToken:        ' + mDesc[1]);
  console.log('  srcReceivers:    ' + JSON.stringify(mDesc[2]));
  console.log('  srcAmounts:      ' + mDesc[3].map(function(x) { return x.toString(); }));
  console.log('  feeReceivers:    ' + JSON.stringify(mDesc[4]));
  console.log('  feeAmounts:      ' + mDesc[5].map(function(x) { return x.toString(); }));
  console.log('  dstReceiver:     ' + mDesc[6]);
  console.log('  amount:          ' + mDesc[7].toString());
  console.log('  minReturnAmount: ' + mDesc[8].toString());
  console.log('  flags:           ' + mDesc[9].toString());
  console.log('');
  
  // Compute expected minReturnAmount
  var nAmountOut = ethers.BigNumber.from(nRS.amountOut);
  var mAmountOut = ethers.BigNumber.from(mRS.amountOut);
  
  console.log('--- Route amountOut ---');
  console.log('  NexVault (with fee):  ' + nAmountOut.toString() + ' (' + ethers.utils.formatEther(nAmountOut) + ' POL)');
  console.log('  MetaMask (no fee):    ' + mAmountOut.toString() + ' (' + ethers.utils.formatEther(mAmountOut) + ' POL)');
  console.log('  Difference:           ' + mAmountOut.sub(nAmountOut).toString() + ' (' + ethers.utils.formatEther(mAmountOut.sub(nAmountOut)) + ' POL)');
  console.log('');
  
  console.log('--- minReturnAmount comparison ---');
  var nMin = ethers.BigNumber.from(nDesc[8].toString());
  var mMin = ethers.BigNumber.from(mDesc[8].toString());
  console.log('  NexVault minReturnAmount: ' + nMin.toString() + ' (' + ethers.utils.formatEther(nMin) + ' POL)');
  console.log('  MetaMask minReturnAmount: ' + mMin.toString() + ' (' + ethers.utils.formatEther(mMin) + ' POL)');
  console.log('  NexVault ratio to amountOut: ' + (parseFloat(nMin.toString()) / parseFloat(nAmountOut.toString()) * 100).toFixed(2) + '%');
  console.log('  MetaMask ratio to amountOut: ' + (parseFloat(mMin.toString()) / parseFloat(mAmountOut.toString()) * 100).toFixed(2) + '%');
  console.log('');
  
  // The crucial comparison: which minReturnAmount is higher?
  console.log('--- CRITICAL: Which minReturnAmount is harder to satisfy? ---');
  if (nMin.gt(mMin)) {
    console.log('  NexVault minReturnAmount > MetaMask minReturnAmount');
    console.log('  NexVault is STRICTER by: ' + ethers.utils.formatEther(nMin.sub(mMin)) + ' POL');
  } else {
    console.log('  MetaMask minReturnAmount > NexVault minReturnAmount');
    console.log('  MetaMask is STRICTER by: ' + ethers.utils.formatEther(mMin.sub(nMin)) + ' POL');
  }
  
  // Also check: what is the ACTUAL swap return for this exact amount?
  // When fee is involved, the router deducts fee from the output
  // The minReturnAmount is checked AFTER fee deduction
  console.log('');
  console.log('--- Fee impact analysis ---');
  var feeFromOutput = nAmountOut.mul(50).div(10000);  // 0.5% of amountOut
  console.log('  Fee deducted from output: ~' + ethers.utils.formatEther(feeFromOutput) + ' POL');
  console.log('  Effective output after fee: ~' + ethers.utils.formatEther(nAmountOut.sub(feeFromOutput)) + ' POL');
  console.log('  minReturnAmount is checked against: the FULL output (before fee deduction by router)');
  console.log('');
  
  // The NexVault slippage + fee combination
  // Kyber builds the minReturnAmount based on the amountOut from route (which already accounts for fee)
  // So minReturnAmount = amountOut * (1 - slippage/10000)
  var expectedNexvaultMin = nAmountOut.mul(9900).div(10000);
  var expectedMetamaskMin = mAmountOut.mul(9800).div(10000);
  console.log('--- Expected vs Actual minReturnAmount ---');
  console.log('  Expected NexVault (amountOut * 0.99): ' + expectedNexvaultMin.toString());
  console.log('  Actual NexVault calldata:             ' + nMin.toString());
  console.log('  Match? ' + (expectedNexvaultMin.eq(nMin) ? 'YES' : 'NO (diff: ' + expectedNexvaultMin.sub(nMin).toString() + ')'));
  console.log('');
  console.log('  Expected MetaMask (amountOut * 0.98): ' + expectedMetamaskMin.toString());
  console.log('  Actual MetaMask calldata:             ' + mMin.toString());
  console.log('  Match? ' + (expectedMetamaskMin.eq(mMin) ? 'YES' : 'NO (diff: ' + expectedMetamaskMin.sub(mMin).toString() + ')'));
}

main().catch(function(err) { console.error(err); process.exit(1); });
