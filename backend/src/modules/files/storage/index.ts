import { env } from '../../../config/environment';
import { LocalStorage } from './local.storage';
import type { StorageProvider } from './storage.provider';

let provider: StorageProvider | null = null;

/** Returns the configured storage provider (singleton). */
export function getStorage(): StorageProvider {
  if (provider) return provider;
  switch (env.STORAGE_DRIVER) {
    case 'local':
    default:
      provider = new LocalStorage();
      return provider;
  }
}

export type { StorageProvider } from './storage.provider';
