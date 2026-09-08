import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationService } from '../../core/services/notification.service';

/** Renders the toast stack. Mount once in the shell. */
@Component({
  selector: 'app-toasts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ts" aria-live="polite">
      @for (t of notify.toasts(); track t.id) {
        <div class="ts__item" [attr.data-kind]="t.kind" role="status">
          <div class="ts__text">
            @if (t.title) {
              <strong>{{ t.title }}</strong>
            }
            <span>{{ t.message }}</span>
          </div>
          <button type="button" class="ts__x" aria-label="Dismiss" (click)="notify.dismiss(t.id)">
            ✕
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .ts {
        position: fixed;
        left: 50%;
        transform: translateX(-50%);
        top: calc(0.75rem + var(--safe-top));
        z-index: 1300;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: min(30rem, calc(100vw - 1.5rem));
      }
      .ts__item {
        display: flex;
        align-items: flex-start;
        gap: 0.6rem;
        padding: 0.75rem 0.9rem;
        border-radius: var(--radius-md);
        background: var(--color-surface);
        border-left: 4px solid var(--color-border-strong);
        box-shadow: var(--shadow-lg);
        font-size: 0.88rem;
        animation: drop 0.16s ease-out;
      }
      [data-kind='success'] { border-left-color: var(--success); }
      [data-kind='error'] { border-left-color: var(--danger); }
      [data-kind='warning'] { border-left-color: var(--warning); }
      [data-kind='info'] { border-left-color: var(--tone-ready-fg); }
      .ts__text { display: flex; flex-direction: column; gap: 0.1rem; flex: 1; }
      .ts__x {
        border: 0; background: transparent; cursor: pointer;
        color: var(--color-text-faint); font-size: 0.8rem; line-height: 1;
      }
      @keyframes drop { from { opacity: 0; transform: translateY(-0.5rem); } }
    `,
  ],
})
export class Toasts {
  readonly notify = inject(NotificationService);
}
