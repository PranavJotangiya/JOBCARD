import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toasts } from '../shared/components/toasts';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { TranslationService, LANGS, type Lang } from '../core/i18n/translation.service';

/** Minimal centered chrome for /login and /setup, with a language switcher. */
@Component({
  selector: 'app-auth-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Toasts, TranslatePipe],
  template: `
    <div class="auth">
      <div class="auth__inner">
        <div class="auth__brand">
          <span class="auth__logo" aria-hidden="true">🧵</span>
          <span class="auth__name">JOBCARD</span>
        </div>
        <p class="auth__tag">{{ 'app.tagline' | t }}</p>
        <router-outlet />
        <div class="auth__langs" role="group" aria-label="Language">
          @for (l of langs; track l.code) {
            <button
              type="button"
              class="auth__lang"
              [class.is-active]="i18n.lang() === l.code"
              (click)="setLang(l.code)"
            >
              {{ l.labelKey | t }}
            </button>
          }
        </div>
      </div>
    </div>
    <app-toasts />
  `,
  styles: [
    `
      .auth {
        min-height: 100dvh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        background: radial-gradient(120% 80% at 50% 0%, var(--color-primary-soft), var(--color-bg) 60%);
      }
      .auth__inner {
        width: 100%;
        max-width: 24rem;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl);
        padding: 1.75rem 1.5rem;
        box-shadow: var(--shadow-md);
      }
      .auth__brand {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        justify-content: center;
      }
      .auth__logo { font-size: 1.5rem; }
      .auth__name { font-weight: 800; letter-spacing: 0.12em; font-size: 1.15rem; }
      .auth__tag {
        text-align: center;
        color: var(--color-text-secondary);
        font-size: 0.85rem;
        margin: 0.35rem 0 1.35rem;
      }
      .auth__langs {
        display: flex;
        gap: 0.4rem;
        justify-content: center;
        margin-top: 1.25rem;
      }
      .auth__lang {
        min-height: 40px;
        padding: 0 0.8rem;
        border-radius: var(--radius-pill);
        border: 1.5px solid var(--color-border-strong);
        background: var(--color-surface);
        font: inherit;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--color-text-secondary);
        cursor: pointer;
      }
      .auth__lang.is-active {
        border-color: var(--color-primary);
        color: var(--color-primary-strong);
        background: var(--color-primary-soft);
      }
    `,
  ],
})
export class AuthShell {
  readonly i18n = inject(TranslationService);
  readonly langs = LANGS;

  setLang(lang: Lang): void {
    this.i18n.setLang(lang);
  }
}
