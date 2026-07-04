const https = require('https');
const fs = require('fs');

const rpcs = [
  "polygon.meowrpc.com",
  "polygon-mainnet.public.blastapi.io",
  "1rpc.io",
  "rpc-mainnet.maticvigil.com",
  "rpc.polygon.bor.marlin.org"
];

const paths = [
  "/", "/", "/matic", "/", "/"
];

function fetchRPC(hostname, path, method, params) {
  const data = JSON.stringify({ jsonrpc: "2.0", method: method, params: params, id: 1 });
  const options = {
    hostname: hostname,
    port: 443,
    path: path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) {
            resolve(null); // error from rpc
          } else {
            resolve(parsed);
          }
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.write(data);
    req.end();
  });
}

async function run() {
  let receipt = null;
  let txinfo = null;

  for (let i = 0; i < rpcs.length; i++) {
    console.log("Trying", rpcs[i]);
    receipt = await fetchRPC(rpcs[i], paths[i], "eth_getTransactionReceipt", ["0xc6792d297606cd299cb1e6c15b63c3e211e21a4ad60a6767cf8541c73d5d73a7"]);
    if (receipt && receipt.result) {
      txinfo = await fetchRPC(rpcs[i], paths[i], "eth_getTransactionByHash", ["0xc6792d297606cd299cb1e6c15b63c3e211e21a4ad60a6767cf8541c73d5d73a7"]);
      if (txinfo && txinfo.result) {
        console.log("Success with", rpcs[i]);
        fs.writeFileSync('tx_receipt.json', JSON.stringify(receipt, null, 2));
        fs.writeFileSync('tx_info.json', JSON.stringify(txinfo, null, 2));
        return;
      }
    }
  }
  console.log("All failed");
}
run();
