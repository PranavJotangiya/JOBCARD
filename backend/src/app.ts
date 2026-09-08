import express, { type Application, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/environment';
import { corsOptions } from './config/cors';
import { requestLogger } from './middleware/request-logger.middleware';
import { apiRateLimiter } from './middleware/rate-limit.middleware';
import { notFoundHandler } from './middleware/not-found.middleware';
import { errorHandler } from './middleware/error.middleware';
import { apiRouter } from './routes';

/**
 * Builds and configures the Express application.
 *
 * Separate from `server.ts` (which owns the process: DB connection, port binding,
 * signal handling) so integration tests can import the app without a listener.
 *
 * Middleware order:
 *   security headers -> CORS -> compression -> cookies -> body parsing
 *   -> request logging -> rate limiting -> routes -> 404 -> error handler
 */
export function createApp(): Application {
  const app = express();

  app.set('trust proxy', env.isProduction ? 1 : false);
  app.set('query parser', 'extended');
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: env.isProduction ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cors(corsOptions));
  app.use(compression());
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(express.json({ limit: env.REQUEST_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: env.REQUEST_BODY_LIMIT }));
  app.use(requestLogger);

  app.get('/', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        name: 'JOBCARD API',
        environment: env.NODE_ENV,
        api: env.API_PREFIX,
        health: `${env.API_PREFIX}/health`,
      },
    });
  });

  app.use(env.API_PREFIX, apiRateLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
