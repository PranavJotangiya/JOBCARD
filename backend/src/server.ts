import type { Server } from 'node:http';
import { app } from './app';
import { env } from './config/environment';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './utils/logger';

/**
 * Process entry point.
 *
 * Responsibilities kept here (and out of `app.ts`):
 *  - establish the MongoDB Atlas connection before accepting traffic
 *  - bind the HTTP port
 *  - shut down gracefully on SIGINT / SIGTERM (drain connections, close DB)
 *  - fail fast on unrecoverable errors
 */
async function bootstrap(): Promise<void> {
  await connectDatabase();

  const server: Server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV, api: env.API_PREFIX },
      `JOBCARD API listening on http://localhost:${env.PORT}${env.API_PREFIX}`,
    );
  });

  const shutdown = (signal: string): void => {
    logger.info({ signal }, 'Shutting down gracefully');
    server.close(() => {
      void disconnectDatabase().finally(() => {
        logger.info('Shutdown complete');
        process.exit(0);
      });
    });

    // Don't hang forever if connections refuse to drain.
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection');
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception — exiting');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to start JOBCARD API');
  process.exit(1);
});
