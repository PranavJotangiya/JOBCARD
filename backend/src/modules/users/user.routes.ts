import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import { validate } from '../../middleware/validate.middleware';
import { Permission } from '../../constants/roles';
import { idParamSchema } from '../shared/common.validation';
import { userController } from './user.controller';
import { createUserSchema, listUsersQuerySchema, updateUserSchema } from './user.validation';

const router = Router();
router.use(authenticate, authorize(Permission.USER_MANAGE)); // ADMIN only

// POST /api/v1/users
router.post('/', validate({ body: createUserSchema }), userController.create);

// GET /api/v1/users
router.get('/', validate({ query: listUsersQuerySchema }), userController.list);

// PATCH /api/v1/users/:id
router.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateUserSchema }),
  userController.update,
);

export { router as userRoutes };
