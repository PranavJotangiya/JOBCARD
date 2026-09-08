import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { ApiResponse } from '../../utils/api-response';
import { manufacturerService } from './manufacturer.service';
import type { CreateManufacturerInput, ListManufacturersQuery } from './manufacturer.validation';

export const manufacturerController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const manufacturer = await manufacturerService.addForJobber(
      req.body as CreateManufacturerInput,
      req.auth!,
    );
    return ApiResponse.created(res, { manufacturer: manufacturer.toJSON() }, 'Manufacturer added');
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const { items, pagination } = await manufacturerService.list(
      req.query as unknown as ListManufacturersQuery,
      req.auth!,
    );
    return ApiResponse.list(
      res,
      items.map((m) => m.toJSON()),
      pagination,
    );
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const manufacturer = await manufacturerService.getForActor(req.params.id, req.auth!);
    return ApiResponse.ok(res, { manufacturer: manufacturer.toJSON() });
  }),
};
