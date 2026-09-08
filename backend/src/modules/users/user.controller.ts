import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { ApiResponse } from '../../utils/api-response';
import { userService } from './user.service';
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from './user.validation';

export const userController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.create(req.body as CreateUserInput, req.auth!);
    return ApiResponse.created(res, { user: user.toJSON() }, 'User created');
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const { items, pagination } = await userService.list(req.query as unknown as ListUsersQuery);
    return ApiResponse.list(
      res,
      items.map((u) => u.toJSON()),
      pagination,
    );
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.update(req.params.id, req.body as UpdateUserInput, req.auth!);
    return ApiResponse.ok(res, { user: user.toJSON() }, 'User updated');
  }),
};
