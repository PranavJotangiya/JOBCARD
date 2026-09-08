import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize, requireOwnershipScope } from '../../middleware/authorize.middleware';
import { validate } from '../../middleware/validate.middleware';
import { Permission } from '../../constants/roles';
import { idParamSchema } from '../shared/common.validation';
import { jobCardController } from './jobcard.controller';
import {
  createJobCardSchema,
  listJobCardsQuerySchema,
  statusActionSchema,
  updateJobCardSchema,
} from './jobcard.validation';

const router = Router();
router.use(authenticate, requireOwnershipScope);

// Collection
router.post(
  '/',
  authorize(Permission.JOBCARD_CREATE),
  validate({ body: createJobCardSchema }),
  jobCardController.create,
);
router.get(
  '/',
  authorize(Permission.JOBCARD_READ),
  validate({ query: listJobCardsQuerySchema }),
  jobCardController.list,
);

// Single resource
router.get(
  '/:id',
  authorize(Permission.JOBCARD_READ),
  validate({ params: idParamSchema }),
  jobCardController.getById,
);
router.put(
  '/:id',
  authorize(Permission.JOBCARD_UPDATE),
  validate({ params: idParamSchema, body: updateJobCardSchema }),
  jobCardController.update,
);
router.delete(
  '/:id',
  authorize(Permission.JOBCARD_DELETE),
  validate({ params: idParamSchema }),
  jobCardController.remove,
);

// Activity timeline (read)
router.get(
  '/:id/activity',
  authorize(Permission.JOBCARD_READ),
  validate({ params: idParamSchema }),
  jobCardController.activity,
);

// PDF export (read — Manufacturer allowed)
router.get(
  '/:id/pdf',
  authorize(Permission.JOBCARD_EXPORT),
  validate({ params: idParamSchema }),
  jobCardController.pdf,
);

// Status actions — backend-controlled transitions, Jobber only
const statusGuards = [
  authorize(Permission.JOBCARD_STATUS),
  validate({ params: idParamSchema, body: statusActionSchema }),
];
router.post('/:id/ready', ...statusGuards, jobCardController.workAction('ready'));
router.post('/:id/start', ...statusGuards, jobCardController.workAction('start'));
router.post('/:id/complete', ...statusGuards, jobCardController.workAction('complete'));
router.post('/:id/cancel', ...statusGuards, jobCardController.workAction('cancel'));
router.post('/:id/dispatch', ...statusGuards, jobCardController.dispatchAction('dispatch'));
router.post('/:id/bring-back', ...statusGuards, jobCardController.dispatchAction('bring-back'));

export { router as jobCardRoutes };
