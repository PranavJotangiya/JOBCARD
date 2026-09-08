import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { ApiResponse } from '../../utils/api-response';
import { dashboardService } from './dashboard.service';
import { Role } from '../../constants/roles';

export const dashboardController = {
  get: asyncHandler(async (req: Request, res: Response) => {
    const actor = req.auth!;
    let data;
    if (actor.role === Role.JOBBER) data = await dashboardService.forJobber(actor);
    else if (actor.role === Role.MANUFACTURER) data = await dashboardService.forManufacturer(actor);
    else data = await dashboardService.forAdmin(actor);
    return ApiResponse.ok(res, data);
  }),
};
