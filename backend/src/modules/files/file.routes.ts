import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import { validate } from '../../middleware/validate.middleware';
import { Permission } from '../../constants/roles';
import { env } from '../../config/environment';
import { idParamSchema } from '../shared/common.validation';
import { fileController } from './file.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes, files: 1 },
});

const router = Router();
router.use(authenticate);

// POST /api/v1/files  (multipart/form-data, field "file")
router.post('/', authorize(Permission.JOBCARD_CREATE), upload.single('file'), fileController.upload);

// GET /api/v1/files/:id       -> metadata
router.get('/:id', validate({ params: idParamSchema }), fileController.meta);

// GET /api/v1/files/:id/raw   -> bytes
router.get('/:id/raw', validate({ params: idParamSchema }), fileController.raw);

export { router as fileRoutes };
