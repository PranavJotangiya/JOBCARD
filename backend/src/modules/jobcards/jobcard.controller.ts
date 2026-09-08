import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { ApiResponse } from '../../utils/api-response';
import { jobCardService } from './jobcard.service';
import { streamJobCardPdf } from './jobcard.pdf';
import type { WorkAction, DispatchAction } from './jobcard.constants';
import type { CreateJobCardInput, ListJobCardsQuery, UpdateJobCardInput } from './jobcard.validation';

/**
 * Job Card HTTP layer. Thin: validated input in, service call, `ApiResponse`
 * out. All isolation / status rules live in `jobCardService`.
 */
const noteOf = (req: Request): string | undefined =>
  typeof (req.body as { note?: string })?.note === 'string' ? (req.body as { note: string }).note : undefined;

export const jobCardController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const jobCard = await jobCardService.create(req.body as CreateJobCardInput, req.auth!);
    return ApiResponse.created(res, { jobCard }, 'Job Card created');
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const { items, pagination } = await jobCardService.list(
      req.query as unknown as ListJobCardsQuery,
      req.auth!,
    );
    return ApiResponse.list(res, items, pagination);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const jobCard = await jobCardService.getById(req.params.id, req.auth!);
    return ApiResponse.ok(res, { jobCard });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const jobCard = await jobCardService.update(
      req.params.id,
      req.body as UpdateJobCardInput,
      req.auth!,
    );
    return ApiResponse.ok(res, { jobCard }, 'Job Card updated');
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await jobCardService.remove(req.params.id, req.auth!);
    return ApiResponse.ok(res, { id: req.params.id }, 'Job Card deleted');
  }),

  workAction: (action: WorkAction) =>
    asyncHandler(async (req: Request, res: Response) => {
      const jobCard = await jobCardService.performWorkAction(
        req.params.id,
        action,
        req.auth!,
        noteOf(req),
      );
      return ApiResponse.ok(res, { jobCard }, `Job Card: ${action}`);
    }),

  dispatchAction: (action: DispatchAction) =>
    asyncHandler(async (req: Request, res: Response) => {
      const jobCard = await jobCardService.performDispatchAction(
        req.params.id,
        action,
        req.auth!,
        noteOf(req),
      );
      return ApiResponse.ok(res, { jobCard }, `Job Card: ${action}`);
    }),

  activity: asyncHandler(async (req: Request, res: Response) => {
    const activity = await jobCardService.activity(req.params.id, req.auth!);
    return ApiResponse.ok(res, { activity });
  }),

  pdf: asyncHandler(async (req: Request, res: Response) => {
    const jobCard = await jobCardService.getById(req.params.id, req.auth!);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${jobCard.jobCardNumber}.pdf"`,
    );
    streamJobCardPdf(jobCard, res);
  }),
};
