import type { Readable } from 'node:stream';

/**
 * Storage abstraction. The rest of the app depends on this interface, never on a
 * concrete driver, so local disk today can become S3/GCS later with no changes
 * outside `modules/files/storage`.
 */
export interface StoredObject {
  /** Opaque key the provider uses to locate the object again. */
  key: string;
  size: number;
}

export interface StorageProvider {
  readonly name: string;
  save(input: {
    buffer: Buffer;
    /** original file name, used to derive an extension */
    filename: string;
    mimeType: string;
  }): Promise<StoredObject>;
  createReadStream(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
