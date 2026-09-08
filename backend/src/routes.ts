import { Router } from 'express';
import { healthRoutes } from './modules/health/health.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { userRoutes } from './modules/users/user.routes';
import { manufacturerRoutes } from './modules/manufacturers/manufacturer.routes';
import { jobberRoutes } from './modules/jobbers/jobber.routes';
import { jobCardRoutes } from './modules/jobcards/jobcard.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { fileRoutes } from './modules/files/file.routes';

/**
 * API v1 router — one mount line per module.
 *
 * Adding a business domain = add its module folder and one `apiRouter.use(...)`
 * here; nothing else is touched. A breaking change gets a `v2` router alongside
 * this one rather than mutating v1.
 */
export const apiRouter = Router();

apiRouter.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'JOBCARD API v1',
      resources: [
        '/health',
        '/auth',
        '/users',
        '/manufacturers',
        '/jobbers',
        '/jobcards',
        '/dashboard',
        '/files',
      ],
    },
  });
});

apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/manufacturers', manufacturerRoutes);
apiRouter.use('/jobbers', jobberRoutes);
apiRouter.use('/jobcards', jobCardRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/files', fileRoutes);
