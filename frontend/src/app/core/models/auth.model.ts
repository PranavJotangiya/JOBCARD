export type Role = 'ADMIN' | 'MANUFACTURER' | 'JOBBER';

/** `data.user` from POST /auth/login and /auth/setup. */
export interface SessionUser {
  id: string;
  name: string;
  username: string;
  role: Role;
  manufacturerId: string | null;
  jobberId: string | null;
}

/** Richer shape from GET /auth/me. */
export interface Profile extends SessionUser {
  manufacturerName: string | null;
  jobberName: string | null;
  lastLoginAt: string | null;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface FirstAdminPayload {
  name: string;
  username: string;
  password: string;
}
