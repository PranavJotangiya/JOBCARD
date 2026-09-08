import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { ConfirmDialogService } from './confirm-dialog.service';

/** Renders the active confirmation dialog. Mount once in the shell. */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (svc.state(); as s) {
      <div class="cd">
        <button type="button" class="cd__scrim" aria-label="Cancel" (click)="svc.respond(false)"></button>
        <div class="cd__box" role="alertdialog" aria-modal="true" [attr.aria-label]="s.title">
          <h2 class="cd__title">{{ s.title }}</h2>
          <p class="cd__msg">{{ s.message }}</p>
          <div class="cd__actions">
            <button type="button" class="btn btn--ghost" (click)="svc.respond(false)">
              {{ s.cancelLabel }}
            </button>
            <button
              type="button"
              class="btn"
              [class.btn--danger]="s.tone === 'danger'"
              [class.btn--primary]="s.tone !== 'danger'"
              (click)="svc.respond(true)"
            >
              {{ s.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .cd {
        position: fixed;
        inset: 0;
        z-index: 1200;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.25rem;
      }
      .cd__scrim {
        position: absolute;
        inset: 0;
        border: 0;
        padding: 0;
        background: rgba(15, 23, 42, 0.45);
        cursor: pointer;
      }
      .cd__box {
        position: relative;
        background: var(--color-surface);
        border-radius: var(--radius-lg);
        padding: 1.4rem;
        width: 100%;
        max-width: 24rem;
        box-shadow: var(--shadow-lg);
      }
      .cd__title { margin: 0 0 0.4rem; font-size: 1.1rem; }
      .cd__msg { margin: 0 0 1.2rem; color: var(--color-text-secondary); font-size: 0.92rem; }
      .cd__actions { display: flex; gap: 0.5rem; }
      .cd__actions .btn { flex: 1; }
    `,
  ],
})
export class ConfirmDialog {
  readonly svc = inject(ConfirmDialogService);

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.svc.state()) this.svc.respond(false);
  }
}
