import requests
import json
import sys

rpcs = [
    "https://polygon-rpc.com/",
    "https://rpc-mainnet.maticvigil.com/",
    "https://polygon.meowrpc.com",
    "https://1rpc.io/matic",
    "https://polygon-mainnet.public.blastapi.io",
    "https://rpc.ankr.com/polygon"
]

tx_hash = "0xc6792d297606cd299cb1e6c15b63c3e211e21a4ad60a6767cf8541c73d5d73a7"
payload_receipt = {"jsonrpc": "2.0", "method": "eth_getTransactionReceipt", "params": [tx_hash], "id": 1}
payload_info = {"jsonrpc": "2.0", "method": "eth_getTransactionByHash", "params": [tx_hash], "id": 1}
headers = {'Content-Type': 'application/json'}

def fetch(payload):
    for rpc in rpcs:
        print(f"Trying {rpc}")
        try:
            r = requests.post(rpc, json=payload, headers=headers, timeout=5)
            if r.status_code == 200:
                data = r.json()
                if "error" not in data:
                    return data
                else:
                    print(f"Error from {rpc}: {data['error']}")
            else:
                print(f"HTTP {r.status_code} from {rpc}")
        except Exception as e:
            print(f"Exception from {rpc}: {e}")
    return None

print("Fetching receipt...")
receipt = fetch(payload_receipt)
if receipt:
    with open("tx_receipt.json", "w") as f:
        json.dump(receipt, f, indent=2)
    print("Saved tx_receipt.json")

print("Fetching info...")
info = fetch(payload_info)
if info:
    with open("tx_info.json", "w") as f:
        json.dump(info, f, indent=2)
    print("Saved tx_info.json")
