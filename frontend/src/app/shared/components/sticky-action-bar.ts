import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Sticky bottom action area for forms / detail screens.
 *
 * Sits above the bottom navigation, respects `env(safe-area-inset-bottom)`, and
 * the host page adds matching bottom padding so it never covers content
 * (`.has-sticky-bar` utility applied by pages that use it).
 */
@Component({
  selector: 'app-sticky-action-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="sab"><ng-content /></div>`,
  styles: [
    `
      .sab {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 40;
        display: flex;
        gap: 0.6rem;
        padding: 0.75rem 1rem calc(0.75rem + var(--safe-bottom));
        background: var(--color-surface);
        border-top: 1px solid var(--color-border);
        box-shadow: 0 -4px 16px rgba(15, 23, 42, 0.06);
      }
      .sab ::ng-deep .btn { flex: 1; }
      @media (min-width: 1024px) {
        .sab {
          left: var(--sidebar-w, 0);
        }
      }
    `,
  ],
})
export class StickyActionBar {}
