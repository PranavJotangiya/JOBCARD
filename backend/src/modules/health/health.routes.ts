import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { getDatabaseState } from '../../config/database';
import { HttpStatus } from '../../constants/http-status';

/**
 * GET /api/v1/health
 *
 * Performs an ACTIVE database check (`admin().ping()`), not a cached flag, and
 * returns 503 when the DB is unreachable so uptime monitors / deploy smoke tests
 * can rely on the status code alone.
 */
const startedAt = Date.now();
const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const db = await getDatabaseState();
    const connected = db.readyState === 1 && db.pingOk;

    const body = {
      success: connected,
      message: connected
        ? 'JOBCARD API is healthy'
        : 'JOBCARD API is running but the database is not reachable',
      status: connected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      version: process.env.npm_package_version ?? '0.1.0',
      database: {
        connected,
        status: db.status,
        readyState: db.readyState,
        pingOk: db.pingOk,
      },
    };
    res.status(connected ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json(body);
  }),
);

export { router as healthRoutes };
