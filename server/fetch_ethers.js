const { ethers } = require("ethers");
const fs = require("fs");

async function main() {
    console.log("Connecting to Polygon mainnet...");
    const provider = new ethers.providers.CloudflareProvider(); // Cloudflare has public polygon? No.
    // wait, ethers 5 has static providers.
    const polyProvider = new ethers.providers.AlchemyProvider("matic", "demo");
    // fallback if demo fails:
    const defaultProvider = ethers.getDefaultProvider("matic");
    
    const txHash = "0xc6792d297606cd299cb1e6c15b63c3e211e21a4ad60a6767cf8541c73d5d73a7";
    
    try {
        console.log("Fetching receipt with default provider...");
        const receipt = await defaultProvider.getTransactionReceipt(txHash);
        fs.writeFileSync('tx_receipt.json', JSON.stringify(receipt, null, 2));
        console.log("Receipt saved.");
        
        console.log("Fetching tx info with default provider...");
        const tx = await defaultProvider.getTransaction(txHash);
        fs.writeFileSync('tx_info.json', JSON.stringify(tx, null, 2));
        console.log("Tx info saved.");
    } catch (e) {
        console.error("Default provider failed:", e.message);
        try {
            console.log("Trying Alchemy provider with 'demo' key...");
            const receipt2 = await polyProvider.getTransactionReceipt(txHash);
            fs.writeFileSync('tx_receipt.json', JSON.stringify(receipt2, null, 2));
            console.log("Receipt saved (Alchemy).");
            
            const tx2 = await polyProvider.getTransaction(txHash);
            fs.writeFileSync('tx_info.json', JSON.stringify(tx2, null, 2));
            console.log("Tx info saved (Alchemy).");
        } catch (e2) {
            console.error("Alchemy provider failed:", e2.message);
        }
    }
}
main();
