import type { CookieOptions, Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { ApiResponse } from '../../utils/api-response';
import { ApiError } from '../../utils/api-error';
import { ErrorCode } from '../../constants/error-codes';
import {
  COOKIE_NAMES,
  accessCookieOptions,
  clearCookieOptions,
  clearRefreshCookieOptions,
  refreshCookieOptions,
} from '../../constants/cookies';
import { extractBearerToken } from '../../utils/jwt';
import { authService, type IssuedTokens } from './auth.service';
import type { FirstAdminSetupInput, LoginInput } from './auth.validation';

/**
 * Auth HTTP layer. Access + refresh tokens are delivered as HttpOnly cookies so
 * browser JS never touches them; the JSON body still includes the user so the
 * SPA can route by role without a second request.
 */
function setAuthCookies(res: Response, tokens: IssuedTokens): void {
  res.cookie(COOKIE_NAMES.ACCESS, tokens.accessToken, accessCookieOptions() as CookieOptions);
  res.cookie(COOKIE_NAMES.REFRESH, tokens.refreshToken, refreshCookieOptions() as CookieOptions);
}

function clearAuthCookies(res: Response): void {
  res.clearCookie(COOKIE_NAMES.ACCESS, clearCookieOptions() as CookieOptions);
  res.clearCookie(COOKIE_NAMES.REFRESH, clearRefreshCookieOptions() as CookieOptions);
}

export const authController = {
  setupStatus: asyncHandler(async (_req: Request, res: Response) => {
    const setupRequired = await authService.isSetupRequired();
    return ApiResponse.ok(res, { setupRequired });
  }),

  runSetup: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.runFirstAdminSetup(req.body as FirstAdminSetupInput);
    setAuthCookies(res, result);
    return ApiResponse.created(res, { user: result.user }, 'Admin account created');
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body as LoginInput);
    setAuthCookies(res, result);
    return ApiResponse.ok(res, { user: result.user }, 'Signed in');
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const cookies = req.cookies as Record<string, string> | undefined;
    const token =
      cookies?.[COOKIE_NAMES.REFRESH] ??
      extractBearerToken(req.headers.authorization) ??
      (typeof (req.body as { refreshToken?: string })?.refreshToken === 'string'
        ? (req.body as { refreshToken: string }).refreshToken
        : null);
    if (!token) {
      throw ApiError.unauthorized('No refresh token supplied', ErrorCode.AUTH_REFRESH_INVALID);
    }
    const tokens = await authService.refresh(token);
    setAuthCookies(res, tokens);
    return ApiResponse.ok(res, { refreshed: true }, 'Session refreshed');
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    if (req.auth) await authService.logout(req.auth.id);
    clearAuthCookies(res);
    return ApiResponse.ok(res, { success: true }, 'Signed out');
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const profile = await authService.getProfile(req.auth!.id);
    return ApiResponse.ok(res, { user: profile });
  }),
};
