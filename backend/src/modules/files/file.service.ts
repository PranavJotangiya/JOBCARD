import type { Readable } from 'node:stream';
import { FileAsset, type FileAssetDocument } from './file.model';
import { getStorage } from './storage';
import { env } from '../../config/environment';
import { ApiError } from '../../utils/api-error';
import { ErrorCode } from '../../constants/error-codes';
import { HttpStatus } from '../../constants/http-status';
import type { AuthenticatedUser } from '../../types/common.types';

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

export const fileService = {
  async uploadPatternImage(
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    actor: AuthenticatedUser,
  ): Promise<FileAssetDocument> {
    if (!ALLOWED_IMAGE_MIME.has(file.mimetype)) {
      throw new ApiError(
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        'Only JPG, PNG, WEBP or HEIC images are allowed',
        ErrorCode.UNSUPPORTED_MEDIA_TYPE,
      );
    }
    if (file.size > env.maxUploadBytes) {
      throw new ApiError(
        HttpStatus.PAYLOAD_TOO_LARGE,
        'The image is too large',
        ErrorCode.PAYLOAD_TOO_LARGE,
      );
    }

    const storage = getStorage();
    const stored = await storage.save({
      buffer: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
    });

    return FileAsset.create({
      originalName: file.originalname,
      storageKey: stored.key,
      storageDriver: storage.name,
      mimeType: file.mimetype,
      size: stored.size,
      kind: 'pattern-image',
      uploadedBy: actor.id,
      uploadedByRole: actor.role,
      jobberId: actor.jobberId,
      manufacturerId: actor.manufacturerId,
    });
  },

  async getByIdForActor(id: string, actor: AuthenticatedUser): Promise<FileAssetDocument> {
    const asset = await FileAsset.findById(id);
    if (!asset) throw ApiError.notFound('File not found', ErrorCode.FILE_NOT_FOUND);

    // Isolation: a file is readable by ADMIN, by the Jobber that owns it, or by a
    // Manufacturer it was shared with (same manufacturerId).
    const isAdmin = actor.role === 'ADMIN';
    const isOwningJobber =
      actor.jobberId != null && asset.jobberId != null && String(asset.jobberId) === actor.jobberId;
    const isLinkedManufacturer =
      actor.manufacturerId != null &&
      asset.manufacturerId != null &&
      String(asset.manufacturerId) === actor.manufacturerId;

    if (!isAdmin && !isOwningJobber && !isLinkedManufacturer) {
      throw ApiError.forbidden('You cannot access this file', ErrorCode.OWNERSHIP_VIOLATION);
    }
    return asset;
  },

  async openStream(asset: FileAssetDocument): Promise<Readable> {
    return getStorage().createReadStream(asset.storageKey);
  },

  /** Attaches this file's manufacturerId once its job card is known. */
  async linkToManufacturer(fileId: string, manufacturerId: string): Promise<void> {
    await FileAsset.updateOne({ _id: fileId }, { $set: { manufacturerId } });
  },
};
