import { createReadStream, existsSync } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { env } from '../../../config/environment';
import { ApiError } from '../../../utils/api-error';
import { ErrorCode } from '../../../constants/error-codes';
import type { StorageProvider, StoredObject } from './storage.provider';

/**
 * Local-disk storage driver for development / single-node deployments.
 * Files land under `backend/<STORAGE_LOCAL_DIR>/` in date-sharded folders.
 */
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'application/pdf': '.pdf',
};

export class LocalStorage implements StorageProvider {
  readonly name = 'local';
  private readonly root: string;

  constructor() {
    this.root = path.isAbsolute(env.STORAGE_LOCAL_DIR)
      ? env.STORAGE_LOCAL_DIR
      : path.resolve(__dirname, '../../../../', env.STORAGE_LOCAL_DIR);
  }

  private resolveKey(key: string): string {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root)) {
      throw ApiError.badRequest('Invalid file key', ErrorCode.VALIDATION_ERROR);
    }
    return full;
  }

  async save({
    buffer,
    filename,
    mimeType,
  }: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
  }): Promise<StoredObject> {
    const now = new Date();
    const shard = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    const ext = EXT_BY_MIME[mimeType] ?? path.extname(filename) ?? '';
    const key = `${shard}/${randomUUID()}${ext}`;
    const full = this.resolveKey(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, buffer);
    const { size } = await stat(full);
    return { key, size };
  }

  createReadStream(key: string): Promise<Readable> {
    const full = this.resolveKey(key);
    if (!existsSync(full)) {
      return Promise.reject(ApiError.notFound('File not found', ErrorCode.FILE_NOT_FOUND));
    }
    return Promise.resolve(createReadStream(full));
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveKey(key), { force: true });
  }

  exists(key: string): Promise<boolean> {
    return Promise.resolve(existsSync(this.resolveKey(key)));
  }
}
