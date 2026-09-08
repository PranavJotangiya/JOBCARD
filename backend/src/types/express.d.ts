import type { AuthenticatedUser } from './common.types';

declare global {
  namespace Express {
    interface Request {
      /** Populated by `authenticate` once a valid access token (cookie or bearer) is verified. */
      auth?: AuthenticatedUser;
      /** Correlation id for a single request. */
      id?: string;
    }
  }
}

export {};
