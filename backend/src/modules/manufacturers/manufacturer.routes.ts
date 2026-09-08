import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize, requireOwnershipScope } from '../../middleware/authorize.middleware';
import { validate } from '../../middleware/validate.middleware';
import { Permission } from '../../constants/roles';
import { idParamSchema } from '../shared/common.validation';
import { manufacturerController } from './manufacturer.controller';
import { createManufacturerSchema, listManufacturersQuerySchema } from './manufacturer.validation';

const router = Router();
router.use(authenticate, requireOwnershipScope);

// POST /api/v1/manufacturers  (JOBBER adds a Manufacturer contact)
router.post(
  '/',
  authorize(Permission.MANUFACTURER_MANAGE),
  validate({ body: createManufacturerSchema }),
  manufacturerController.create,
);

// GET /api/v1/manufacturers
router.get(
  '/',
  authorize(Permission.MANUFACTURER_READ),
  validate({ query: listManufacturersQuerySchema }),
  manufacturerController.list,
);

// GET /api/v1/manufacturers/:id
router.get(
  '/:id',
  authorize(Permission.MANUFACTURER_READ),
  validate({ params: idParamSchema }),
  manufacturerController.getById,
);

export { router as manufacturerRoutes };
