import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { ApiResponse } from '../../utils/api-response';
import { jobberService } from './jobber.service';
import { jobCardService } from '../jobcards/jobcard.service';
import type { CreateJobberInput, ListJobbersQuery } from './jobber.validation';

export const jobberController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const jobber = await jobberService.addForManufacturer(req.body as CreateJobberInput, req.auth!);
    return ApiResponse.created(res, { jobber: jobber.toJSON() }, 'Jobber added');
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const { items, pagination } = await jobberService.list(
      req.query as unknown as ListJobbersQuery,
      req.auth!,
    );
    return ApiResponse.list(
      res,
      items.map((j) => j.toJSON()),
      pagination,
    );
  }),

  /** Jobber detail for a Manufacturer: the master record + this pair's job-card stats. */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const jobber = await jobberService.getForActor(req.params.id, req.auth!);
    const stats = await jobCardService.statsForManufacturerJobber(req.auth!, jobber.id);
    return ApiResponse.ok(res, { jobber: jobber.toJSON(), stats });
  }),
};
