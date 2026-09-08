import { User, type UserDocument } from '../users/user.model';
import { Manufacturer } from '../manufacturers/manufacturer.model';
import { Jobber } from '../jobbers/jobber.model';
import { Role } from '../../constants/roles';
import { ApiError } from '../../utils/api-error';
import { ErrorCode } from '../../constants/error-codes';
import { hashPassword, verifyPassword } from '../../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { logger } from '../../utils/logger';
import type { AuthenticatedUser } from '../../types/common.types';
import type { FirstAdminSetupInput, LoginInput } from './auth.validation';

/**
 * Authentication business logic — real bcrypt + JWT.
 *
 * Tokens are returned to the controller, which sets them as HttpOnly cookies.
 * `tokenVersion` on the user enables server-side revocation (logout / disable).
 */
export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthProfile extends AuthenticatedUser {
  manufacturerName: string | null;
  jobberName: string | null;
  lastLoginAt: string | null;
}

function toAuthUser(user: UserDocument): AuthenticatedUser {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    manufacturerId: user.manufacturerId ? String(user.manufacturerId) : null,
    jobberId: user.jobberId ? String(user.jobberId) : null,
  };
}

function issueTokens(user: UserDocument): IssuedTokens {
  return {
    accessToken: signAccessToken(toAuthUser(user)),
    refreshToken: signRefreshToken(user.id, user.tokenVersion),
  };
}

export const authService = {
  /** True while no ADMIN user exists — gates the one-time setup endpoint. */
  async isSetupRequired(): Promise<boolean> {
    const adminCount = await User.countDocuments({ role: Role.ADMIN });
    return adminCount === 0;
  },

  async runFirstAdminSetup(input: FirstAdminSetupInput): Promise<{ user: AuthenticatedUser } & IssuedTokens> {
    if (!(await this.isSetupRequired())) {
      throw ApiError.conflict(
        'Setup has already been completed',
        ErrorCode.SETUP_ALREADY_COMPLETED,
      );
    }
    const existing = await User.findOne({ username: input.username }).select('_id');
    if (existing) {
      throw ApiError.conflict('That username is taken', ErrorCode.DUPLICATE_RESOURCE);
    }

    const user = await User.create({
      name: input.name,
      username: input.username,
      passwordHash: await hashPassword(input.password),
      role: Role.ADMIN,
    });
    logger.info({ userId: user.id }, 'First admin created via setup');
    return { user: toAuthUser(user), ...issueTokens(user) };
  },

  async login(input: LoginInput): Promise<{ user: AuthenticatedUser } & IssuedTokens> {
    const user = await User.findOne({ username: input.username }).select('+passwordHash');
    if (!user) {
      throw ApiError.unauthorized('Incorrect username or password', ErrorCode.AUTH_INVALID_CREDENTIALS);
    }
    if (!user.isActive) {
      throw ApiError.unauthorized('This account has been disabled', ErrorCode.AUTH_ACCOUNT_DISABLED);
    }
    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) {
      throw ApiError.unauthorized('Incorrect username or password', ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    user.lastLoginAt = new Date();
    await user.save();
    logger.info({ userId: user.id, role: user.role }, 'User logged in');
    return { user: toAuthUser(user), ...issueTokens(user) };
  },

  async refresh(refreshToken: string): Promise<IssuedTokens> {
    const claims = verifyRefreshToken(refreshToken);
    const user = await User.findById(claims.sub).select('+passwordHash');
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Your session is no longer valid', ErrorCode.AUTH_REFRESH_INVALID);
    }
    if (claims.tv !== user.tokenVersion) {
      throw ApiError.unauthorized('Your session has been revoked', ErrorCode.AUTH_REFRESH_INVALID);
    }
    return issueTokens(user);
  },

  async logout(userId: string): Promise<void> {
    await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
    logger.info({ userId }, 'User logged out');
  },

  async getProfile(userId: string): Promise<AuthProfile> {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found', ErrorCode.USER_NOT_FOUND);

    const [manufacturer, jobber] = await Promise.all([
      user.manufacturerId ? Manufacturer.findById(user.manufacturerId).select('name') : null,
      user.jobberId ? Jobber.findById(user.jobberId).select('name') : null,
    ]);

    return {
      ...toAuthUser(user),
      manufacturerName: manufacturer?.name ?? null,
      jobberName: jobber?.name ?? null,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    };
  },
};
