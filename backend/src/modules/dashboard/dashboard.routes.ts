import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize, requireOwnershipScope } from '../../middleware/authorize.middleware';
import { Permission } from '../../constants/roles';
import { dashboardController } from './dashboard.controller';

const router = Router();

// GET /api/v1/dashboard  — role-aware payload
router.get(
  '/',
  authenticate,
  requireOwnershipScope,
  authorize(Permission.DASHBOARD_VIEW),
  dashboardController.get,
);

export { router as dashboardRoutes };
