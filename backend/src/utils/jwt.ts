import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { env } from '../config/environment';
import { ApiError } from './api-error';
import { ErrorCode } from '../constants/error-codes';
import type { AuthenticatedUser } from '../types/common.types';

/**
 * Typed wrapper around `jsonwebtoken`: centralises secrets/TTLs, produces a typed
 * payload, and converts library errors into the API error contract.
 *
 * Tokens are delivered to browsers as HttpOnly cookies (see auth module); a
 * bearer header is also accepted for non-browser clients / tests.
 */
type TokenType = 'access' | 'refresh';

export interface AccessTokenClaims extends JwtPayload {
  sub: string;
  username: string;
  name: string;
  role: AuthenticatedUser['role'];
  manufacturerId: string | null;
  jobberId: string | null;
  type: 'access';
}

export interface RefreshTokenClaims extends JwtPayload {
  sub: string;
  type: 'refresh';
  /** token version — bump on the user to revoke every outstanding refresh token */
  tv: number;
}

const secretFor = (t: TokenType): string =>
  t === 'access' ? env.AUTH_ACCESS_SECRET : env.AUTH_REFRESH_SECRET;

const ttlFor = (t: TokenType): string =>
  t === 'access' ? env.ACCESS_TOKEN_TTL : env.REFRESH_TOKEN_TTL;

export function signAccessToken(user: AuthenticatedUser): string {
  const payload: Omit<AccessTokenClaims, keyof JwtPayload> = {
    sub: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    manufacturerId: user.manufacturerId,
    jobberId: user.jobberId,
    type: 'access',
  };
  return jwt.sign(payload, secretFor('access'), { expiresIn: ttlFor('access') } as SignOptions);
}

export function signRefreshToken(userId: string, tokenVersion: number): string {
  const payload: Omit<RefreshTokenClaims, keyof JwtPayload> = {
    sub: userId,
    type: 'refresh',
    tv: tokenVersion,
  };
  return jwt.sign(payload, secretFor('refresh'), { expiresIn: ttlFor('refresh') } as SignOptions);
}

function verify<T extends JwtPayload>(token: string, type: TokenType): T {
  try {
    const decoded = jwt.verify(token, secretFor(type)) as T & { type?: string };
    if (decoded.type !== type) {
      throw new ApiError(401, 'Invalid token type', ErrorCode.AUTH_TOKEN_INVALID);
    }
    return decoded;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, 'Token has expired', ErrorCode.AUTH_TOKEN_EXPIRED);
    }
    throw new ApiError(401, 'Invalid or malformed token', ErrorCode.AUTH_TOKEN_INVALID);
  }
}

export const verifyAccessToken = (token: string): AccessTokenClaims =>
  verify<AccessTokenClaims>(token, 'access');

export const verifyRefreshToken = (token: string): RefreshTokenClaims =>
  verify<RefreshTokenClaims>(token, 'refresh');

export function extractBearerToken(header?: string): string | null {
  if (!header) return null;
  const [scheme, value] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value) return null;
  return value.trim();
}
