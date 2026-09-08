import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { ApiError } from '../utils/api-error';
import { ErrorCode } from '../constants/error-codes';
import { COOKIE_NAMES } from '../constants/cookies';
import { extractBearerToken, verifyAccessToken } from '../utils/jwt';
import { User } from '../modules/users/user.model';
import type { AuthenticatedUser } from '../types/common.types';

/**
 * Verifies the access token (HttpOnly cookie first, then `Authorization: Bearer`)
 * and attaches the caller to `req.auth`, including the ownership scope
 * (`manufacturerId` / `jobberId`) used for data isolation.
 *
 * The token is cryptographically verified AND the account is re-checked in the
 * DB, so a disabled / deleted user cannot keep using a still-valid token.
 */
function readToken(req: Request): string | null {
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.[COOKIE_NAMES.ACCESS];
  if (cookieToken) return cookieToken;
  return extractBearerToken(req.headers.authorization);
}

export const authenticate: RequestHandler = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = readToken(req);
    if (!token) {
      throw ApiError.unauthorized('You are not signed in', ErrorCode.AUTH_REQUIRED);
    }

    const claims = verifyAccessToken(token);

    const user = await User.findById(claims.sub).select(
      '_id name username role manufacturerId jobberId isActive',
    );
    if (!user) {
      throw ApiError.unauthorized('Account no longer exists', ErrorCode.AUTH_TOKEN_INVALID);
    }
    if (!user.isActive) {
      throw ApiError.unauthorized('This account has been disabled', ErrorCode.AUTH_ACCOUNT_DISABLED);
    }

    const authUser: AuthenticatedUser = {
      id: String(user._id),
      name: user.name,
      username: user.username,
      role: user.role,
      manufacturerId: user.manufacturerId ? String(user.manufacturerId) : null,
      jobberId: user.jobberId ? String(user.jobberId) : null,
    };
    req.auth = authUser;
    next();
  },
);

/** Populates `req.auth` if a valid token is present, but never rejects. */
export const optionalAuthenticate: RequestHandler = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = readToken(req);
    if (!token) return next();
    try {
      const claims = verifyAccessToken(token);
      const user = await User.findById(claims.sub).select(
        '_id name username role manufacturerId jobberId isActive',
      );
      if (user && user.isActive) {
        req.auth = {
          id: String(user._id),
          name: user.name,
          username: user.username,
          role: user.role,
          manufacturerId: user.manufacturerId ? String(user.manufacturerId) : null,
          jobberId: user.jobberId ? String(user.jobberId) : null,
        };
      }
    } catch {
      /* best-effort */
    }
    next();
  },
);
