import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { ApiResponse } from '../../utils/api-response';
import { ApiError } from '../../utils/api-error';
import { ErrorCode } from '../../constants/error-codes';
import { fileService } from './file.service';

export const fileController = {
  upload: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw ApiError.badRequest('No file was uploaded (field name must be "file")', ErrorCode.VALIDATION_ERROR);
    }
    const asset = await fileService.uploadPatternImage(req.file, req.auth!);
    return ApiResponse.created(res, { file: asset.toJSON() }, 'File uploaded');
  }),

  /** Streams the raw bytes with a long cache header (assets are immutable). */
  raw: asyncHandler(async (req: Request, res: Response) => {
    const asset = await fileService.getByIdForActor(req.params.id, req.auth!);
    const stream = await fileService.openStream(asset);
    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader('Content-Length', String(asset.size));
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(asset.originalName)}"`);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  }),

  meta: asyncHandler(async (req: Request, res: Response) => {
    const asset = await fileService.getByIdForActor(req.params.id, req.auth!);
    return ApiResponse.ok(res, { file: asset.toJSON() });
  }),
};
