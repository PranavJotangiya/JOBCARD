import { User, type UserDocument } from './user.model';
import { Manufacturer } from '../manufacturers/manufacturer.model';
import { Jobber } from '../jobbers/jobber.model';
import { Role } from '../../constants/roles';
import { ApiError } from '../../utils/api-error';
import { ErrorCode } from '../../constants/error-codes';
import { hashPassword } from '../../utils/password';
import { buildListQuery, buildPaginationMeta, escapeRegex } from '../../utils/pagination';
import { logger } from '../../utils/logger';
import type { AuthenticatedUser, PaginatedResult } from '../../types/common.types';
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from './user.validation';

const nameKeyOf = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, ' ');

/** Admin-only user administration. */
export const userService = {
  async create(input: CreateUserInput, actor: AuthenticatedUser): Promise<UserDocument> {
    const existing = await User.findOne({ username: input.username }).select('_id');
    if (existing) throw ApiError.conflict('That username is taken', ErrorCode.DUPLICATE_RESOURCE);

    let manufacturerId: string | undefined;
    let jobberId: string | undefined;

    if (input.role === Role.MANUFACTURER && input.manufacturerName) {
      const key = nameKeyOf(input.manufacturerName);
      const m = await Manufacturer.findOneAndUpdate(
        { nameKey: key },
        { $setOnInsert: { name: input.manufacturerName.trim(), nameKey: key, createdBy: actor.id } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
      manufacturerId = m.id;
    }
    if (input.role === Role.JOBBER && input.jobberName) {
      const key = nameKeyOf(input.jobberName);
      const j = await Jobber.findOneAndUpdate(
        { nameKey: key },
        { $setOnInsert: { name: input.jobberName.trim(), nameKey: key, createdBy: actor.id } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
      jobberId = j.id;
    }

    const user = await User.create({
      name: input.name,
      username: input.username,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      manufacturerId: manufacturerId ?? null,
      jobberId: jobberId ?? null,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    logger.info({ userId: user.id, role: user.role, by: actor.id }, 'User created');
    return user;
  },

  async list(query: ListUsersQuery): Promise<PaginatedResult<UserDocument>> {
    const opts = buildListQuery(query, {
      sortableFields: ['createdAt', 'name', 'username'],
      defaultSortBy: 'createdAt',
      defaultSortOrder: 'desc',
    });
    const filter: Record<string, unknown> = {};
    if (query.role) filter.role = query.role;
    if (opts.search) {
      const rx = { $regex: escapeRegex(opts.search), $options: 'i' };
      filter.$or = [{ name: rx }, { username: rx }];
    }
    const [items, total] = await Promise.all([
      User.find(filter).sort(opts.sort).skip(opts.skip).limit(opts.limit),
      User.countDocuments(filter),
    ]);
    return { items, pagination: buildPaginationMeta(total, opts.page, opts.limit) };
  },

  async update(id: string, input: UpdateUserInput, actor: AuthenticatedUser): Promise<UserDocument> {
    const user = await User.findById(id).select('+passwordHash');
    if (!user) throw ApiError.notFound('User not found', ErrorCode.USER_NOT_FOUND);

    if (input.name !== undefined) user.name = input.name;
    if (input.isActive !== undefined) user.isActive = input.isActive;
    if (input.password) {
      user.passwordHash = await hashPassword(input.password);
      user.tokenVersion += 1;
    }
    user.updatedBy = actor.id as unknown as UserDocument['updatedBy'];
    await user.save();
    return user;
  },
};
