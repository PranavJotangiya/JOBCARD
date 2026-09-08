import { randomUUID } from 'node:crypto';
import { pinoHttp } from 'pino-http';
import { logger } from '../utils/logger';
import { HttpStatus } from '../constants/http-status';

/**
 * Per-request structured logging (method, path, status, response time, request id).
 *
 * - Attaches an `X-Request-Id` correlation id to every request/response.
 * - Chooses log level by status: 5xx -> error, 4xx -> warn, else -> info.
 * - Sensitive headers are already redacted by the base logger config.
 */
export const requestLogger = pinoHttp({
  logger,
  genReqId(req, res) {
    const existing = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
    res.setHeader('X-Request-Id', existing);
    return existing;
  },
  customLogLevel(_req, res, err) {
    if (err || res.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) return 'error';
    if (res.statusCode >= HttpStatus.BAD_REQUEST) return 'warn';
    return 'info';
  },
  customSuccessMessage(req, res) {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage(req, res, err) {
    return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
  },
  serializers: {
    req(req) {
      return { id: req.id, method: req.method, url: req.url };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },
  autoLogging: {
    ignore(req) {
      return req.url === '/api/v1/health' || req.url === '/favicon.ico';
    },
  },
});
