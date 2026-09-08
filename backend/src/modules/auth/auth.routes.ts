import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { authRateLimiter } from '../../middleware/rate-limit.middleware';
import { authController } from './auth.controller';
import { firstAdminSetupSchema, loginSchema } from './auth.validation';

const router = Router();

/**
 * Auth routes — mounted at /api/v1/auth.
 * Credential endpoints are throttled by `authRateLimiter` (brute-force guard).
 */

// GET  /api/v1/auth/setup-status
router.get('/setup-status', authController.setupStatus);

// POST /api/v1/auth/setup   (one-time; 409 once an admin exists)
router.post('/setup', authRateLimiter, validate({ body: firstAdminSetupSchema }), authController.runSetup);

// POST /api/v1/auth/login
router.post('/login', authRateLimiter, validate({ body: loginSchema }), authController.login);

// POST /api/v1/auth/refresh   (reads the refresh cookie)
router.post('/refresh', authController.refresh);

// POST /api/v1/auth/logout
router.post('/logout', optionalAuthenticate, authController.logout);

// GET  /api/v1/auth/me
router.get('/me', authenticate, authController.me);

export { router as authRoutes };
