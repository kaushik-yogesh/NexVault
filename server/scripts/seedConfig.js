import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

import AppConfig from '../src/models/AppConfig.js';

const defaultConfigs = [
  {
    key: 'SWAP_FEE_ENABLED',
    value: true,
    type: 'SWAP',
    category: 'SWAP_SETTINGS',
    description: 'Enable or disable the platform swap fee'
  },
  {
    key: 'SWAP_FEE_BPS',
    value: 30,
    type: 'SWAP',
    category: 'SWAP_SETTINGS',
    description: 'Platform swap fee in basis points (e.g., 30 for 0.3%)'
  },
  {
    key: 'SWAP_CHARGE_FEE_BY',
    value: 'currency_out',
    type: 'SWAP',
    category: 'SWAP_SETTINGS',
    description: 'How to charge the fee: currency_out or currency_in'
  },
  {
    key: 'TREASURY_WALLET',
    value: process.env.TREASURY_ADDRESS || '0x0000000000000000000000000000000000000000',
    type: 'TREASURY',
    category: 'TREASURY',
    description: 'Wallet address where platform fees are collected'
  },
  {
    key: 'CMC_API_KEY',
    value: process.env.CMC_API_KEY || 'b54bcf4d-1bca-4e8e-9a24-22ff2c3d462c',
    type: 'API',
    category: 'API_SETTINGS',
    description: 'CoinMarketCap Pro API Key'
  },
  {
    key: 'SLIPPAGE_DEFAULT',
    value: '1.0',
    type: 'SWAP',
    category: 'SWAP_SETTINGS',
    description: 'Default slippage tolerance percentage'
  },
  {
    key: 'ENABLE_SWAP',
    value: true,
    type: 'FEATURE_FLAG',
    category: 'FEATURE_TOGGLES',
    description: 'Toggle to enable or disable the swap feature globally'
  },
  {
    key: 'SECURITY_TURNSTILE_ENABLED',
    value: true,
    type: 'SECURITY',
    category: 'SECURITY',
    description: 'Enable Cloudflare Turnstile on auth and sensitive routes'
  },
  {
    key: 'SECURITY_VPN_BLOCK',
    value: false,
    type: 'SECURITY',
    category: 'SECURITY',
    description: 'Block high threat score IPs (VPN/Datacenter)'
  },
  {
    key: 'SECURITY_BOT_BLOCK',
    value: true,
    type: 'SECURITY',
    category: 'SECURITY',
    description: 'Block requests with low CF-Bot-Score'
  },
  {
    key: 'RATE_LIMIT_LOGIN',
    value: 5,
    type: 'SECURITY',
    category: 'RATE_LIMITS',
    description: 'Max login attempts per minute per IP'
  },
  {
    key: 'RATE_LIMIT_SWAP',
    value: 30,
    type: 'SECURITY',
    category: 'RATE_LIMITS',
    description: 'Max swap operations per minute per IP'
  },
  {
    key: 'RATE_LIMIT_API',
    value: 60,
    type: 'SECURITY',
    category: 'RATE_LIMITS',
    description: 'Max general API requests per minute per IP'
  }
];

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexvault';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    for (const conf of defaultConfigs) {
      await AppConfig.findOneAndUpdate(
        { key: conf.key },
        { 
          $setOnInsert: {
            value: conf.value,
            type: conf.type,
            category: conf.category,
            description: conf.description
          }
        },
        { upsert: true, new: true }
      );
      console.log(`Seeded config: ${conf.key}`);
    }

    console.log('Config seeding complete!');
  } catch (error) {
    console.error('Error seeding config:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
