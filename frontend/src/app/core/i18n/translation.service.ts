import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { en } from './en';
import { hi } from './hi';
import { gu } from './gu';

export type Lang = 'en' | 'hi' | 'gu';
export const LANGS: { code: Lang; labelKey: string }[] = [
  { code: 'en', labelKey: 'lang.en' },
  { code: 'hi', labelKey: 'lang.hi' },
  { code: 'gu', labelKey: 'lang.gu' },
];

const DICTS: Record<Lang, Record<string, string>> = { en, hi, gu };
const STORAGE_KEY = `${environment.storagePrefix}lang`;

/**
 * Runtime translation. UI strings are keys resolved here, never hardcoded in
 * components. Missing keys fall back to English, then to the key itself, so the
 * layout never breaks on an untranslated string.
 */
@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly _lang = signal<Lang>(this.initialLang());
  readonly lang = this._lang.asReadonly();

  setLang(lang: Lang): void {
    this._lang.set(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang;
  }

  translate(key: string, params?: Record<string, string | number>): string {
    const lang = this._lang();
    const raw = DICTS[lang][key] ?? en[key] ?? key;
    if (!params) return raw;
    return raw.replace(/\{(\w+)\}/g, (_m, name: string) =>
      params[name] !== undefined ? String(params[name]) : `{${name}}`,
    );
  }

  private initialLang(): Lang {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored && stored in DICTS) {
        document.documentElement.lang = stored;
        return stored;
      }
    } catch {
      /* ignore */
    }
    return 'en';
  }
}
