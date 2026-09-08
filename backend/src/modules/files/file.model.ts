import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { toJSONPlugin } from '../../models/plugins/to-json.plugin';

/**
 * Metadata for a stored file. The BINARY IS NOT HERE — only a `storageKey` that
 * points into the configured StorageProvider (local disk / S3 / …).
 */
export interface IFileAsset {
  originalName: string;
  storageKey: string;
  storageDriver: string;
  mimeType: string;
  size: number;
  kind: 'pattern-image' | 'other';
  uploadedBy: Types.ObjectId | null;
  uploadedByRole: string | null;
  /** ownership scope so files inherit the same isolation as job cards */
  jobberId: Types.ObjectId | null;
  manufacturerId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export type FileAssetDocument = HydratedDocument<IFileAsset>;
type FileAssetModel = Model<IFileAsset>;

const fileSchema = new Schema<IFileAsset, FileAssetModel>(
  {
    originalName: { type: String, required: true, trim: true, maxlength: 255 },
    storageKey: { type: String, required: true },
    storageDriver: { type: String, required: true, default: 'local' },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    kind: { type: String, enum: ['pattern-image', 'other'], default: 'other' },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    uploadedByRole: { type: String, default: null },
    jobberId: { type: Schema.Types.ObjectId, ref: 'Jobber', default: null, index: true },
    manufacturerId: { type: Schema.Types.ObjectId, ref: 'Manufacturer', default: null, index: true },
  },
  { collection: 'file_assets', timestamps: true },
);

// `storageKey` is treated as a private field — the physical location is never
// exposed to clients; they use the `/files/:id/raw` route instead.
toJSONPlugin(fileSchema as unknown as Schema, { private: ['storageKey'] });

export const FileAsset = model<IFileAsset, FileAssetModel>('FileAsset', fileSchema);
