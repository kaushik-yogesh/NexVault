/**
 * NexVault — Database Seed Script
 * 
 * Initializes the MongoDB database with essential baseline data
 * (e.g. system configurations, initial chain records).
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/database.js';
import logger from '../src/utils/logger.js';
import { CHAINS } from '../../shared/constants/chains.js';

// Simple Mongoose model for chains (to store them in DB for dynamic serving)
const chainSchema = new mongoose.Schema({
  chainId: { type: String, required: true, unique: true },
  chainIdDecimal: { type: Number, required: true },
  name: { type: String, required: true },
  shortName: { type: String, required: true },
  nativeCurrency: {
    name: String,
    symbol: String,
    decimals: Number
  },
  rpcUrls: {
    primary: String,
    secondary: String,
    fallback: String
  },
  blockExplorer: {
    name: String,
    url: String,
    apiUrl: String
  },
  isTestnet: { type: Boolean, default: false },
  supportsEIP1559: { type: Boolean, default: true },
  color: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Chain = mongoose.models.Chain || mongoose.model('Chain', chainSchema);

async function seedDatabase() {
  logger.info('🌱 Starting database seed...');

  try {
    await connectDB();
    logger.info('Connected to database.');

    // Seed Chains
    logger.info('Seeding chains...');
    const chainList = Object.values(CHAINS);
    
    for (const chain of chainList) {
      await Chain.findOneAndUpdate(
        { chainId: chain.chainId },
        chain,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    
    logger.info(`✅ Successfully seeded ${chainList.length} chains.`);
    
    // Add additional initial data here (e.g. admin users, global settings)
    
  } catch (error) {
    logger.error('❌ Database seed failed:', error);
  } finally {
    await mongoose.connection.close();
    logger.info('Database connection closed.');
    process.exit(0);
  }
}

seedDatabase();
