const fs = require('fs');

const receipt = JSON.parse(fs.readFileSync('tx_receipt.json', 'utf8'));

console.log(`Transaction Status: ${receipt.status}`);
console.log(`Logs Count: ${receipt.logs.length}`);

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const APPROVAL_TOPIC = "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";

receipt.logs.forEach((log, i) => {
    console.log(`\n--- Log ${i} ---`);
    console.log(`Address: ${log.address}`);
    const topic0 = log.topics[0];
    if (topic0 === TRANSFER_TOPIC) {
        console.log(`Type: Transfer`);
        const from = '0x' + log.topics[1].slice(26);
        const to = '0x' + log.topics[2].slice(26);
        const value = BigInt(log.data).toString();
        console.log(`From: ${from}`);
        console.log(`To: ${to}`);
        console.log(`Value: ${value}`);
    } else if (topic0 === APPROVAL_TOPIC) {
        console.log(`Type: Approval`);
        const owner = '0x' + log.topics[1].slice(26);
        const spender = '0x' + log.topics[2].slice(26);
        const value = BigInt(log.data).toString();
        console.log(`Owner: ${owner}`);
        console.log(`Spender: ${spender}`);
        console.log(`Value: ${value}`);
    } else {
        console.log(`Type: Unknown (${topic0})`);
        console.log(`Data: ${log.data}`);
        log.topics.forEach((t, ti) => console.log(`Topic[${ti}]: ${t}`));
    }
});
