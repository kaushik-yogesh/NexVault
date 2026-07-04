/**
 * NexVault — Pricing Controller
 */

import * as pricingService from '../services/pricingService.js';
import logger from '../utils/logger.js';

export const getNativePrice = async (req, res, next) => {
  try {
    const { chainId } = req.params;
    if (!chainId) return res.status(400).json({ success: false, error: 'chainId is required' });

    const price = await pricingService.getNativePrice(chainId);
    return res.json({ success: true, data: price });
  } catch (error) {
    logger.error(`getNativePrice error: ${error.message}`);
    next(error);
  }
};

export const getTokenPrices = async (req, res, next) => {
  try {
    const { chainId } = req.params;
    const { addresses } = req.query;

    if (!chainId || !addresses) {
      return res.status(400).json({ success: false, error: 'chainId and addresses are required' });
    }

    const addressArray = addresses.split(',').filter(Boolean);
    const prices = await pricingService.getTokenPrices(chainId, addressArray);
    
    return res.json({ success: true, data: prices });
  } catch (error) {
    logger.error(`getTokenPrices error: ${error.message}`);
    next(error);
  }
};

export const getTokenMetadata = async (req, res, next) => {
  try {
    const { chainId } = req.params;
    const { address } = req.query;

    if (!chainId || !address) {
      return res.status(400).json({ success: false, error: 'chainId and address are required' });
    }

    const meta = await pricingService.getTokenMetadata(chainId, address);
    return res.json({ success: true, data: meta });
  } catch (error) {
    logger.error(`getTokenMetadata error: ${error.message}`);
    next(error);
  }
};

export const getTokenChartData = async (req, res, next) => {
  try {
    const { chainId } = req.params;
    const { address, days } = req.query;

    if (!chainId || !address) {
      return res.status(400).json({ success: false, error: 'chainId and address are required' });
    }

    const chartData = await pricingService.getTokenChartData(chainId, address, parseInt(days) || 1);
    return res.json({ success: true, data: chartData });
  } catch (error) {
    logger.error(`getTokenChartData error: ${error.message}`);
    next(error);
  }
};
