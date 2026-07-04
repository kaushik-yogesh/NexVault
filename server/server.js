/**
 * NexVault — Server Entry Point
 */

import 'dotenv/config';
import app from './src/app.js';
import { connectDB } from './src/config/database.js';
import logger from './src/utils/logger.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to MongoDB
    try { 
      await connectDB();
      logger.info('✅ MongoDB connected');
    } catch (dbError) {
      logger.warn('⚠️ MongoDB connection failed. Server running in Degraded Mode (No DB connection available).');
    }

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 NexVault API running on port ${PORT}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/api/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`\n${signal} received. Shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Unhandled rejection handler
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
