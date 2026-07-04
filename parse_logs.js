const fs = require('fs');

const receiptStr = fs.readFileSync('tx_receipt.json', 'utf8');
const txStr = fs.readFileSync('tx_info.json', 'utf8');

const receipt = JSON.parse(receiptStr);
const tx = JSON.parse(txStr);

if (receipt.error) {
  console.log("Receipt Error:", receipt.error);
} else {
  console.log("Transaction Status:", receipt.result.status === "0x1" ? "Success" : "Failed");
  console.log("To:", receipt.result.to);
  console.log("From:", receipt.result.from);
  
  console.log("\n--- Logs ---");
  receipt.result.logs.forEach((log, index) => {
    console.log(`Log ${index}:`);
    console.log(`  Address: ${log.address}`);
    console.log(`  Topics:`);
    log.topics.forEach((topic, i) => console.log(`    [${i}]: ${topic}`));
    console.log(`  Data: ${log.data}`);
  });
}
