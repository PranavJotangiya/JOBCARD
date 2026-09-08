import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize, requireOwnershipScope } from '../../middleware/authorize.middleware';
import { validate } from '../../middleware/validate.middleware';
import { Permission } from '../../constants/roles';
import { idParamSchema } from '../shared/common.validation';
import { jobberController } from './jobber.controller';
import { createJobberSchema, listJobbersQuerySchema } from './jobber.validation';

const router = Router();
router.use(authenticate, requireOwnershipScope);

// POST /api/v1/jobbers  (MANUFACTURER adds a Jobber contact)
router.post(
  '/',
  authorize(Permission.JOBBER_MANAGE),
  validate({ body: createJobberSchema }),
  jobberController.create,
);

// GET /api/v1/jobbers
router.get(
  '/',
  authorize(Permission.JOBBER_READ),
  validate({ query: listJobbersQuerySchema }),
  jobberController.list,
);

// GET /api/v1/jobbers/:id
router.get(
  '/:id',
  authorize(Permission.JOBBER_READ),
  validate({ params: idParamSchema }),
  jobberController.getById,
);

export { router as jobberRoutes };
