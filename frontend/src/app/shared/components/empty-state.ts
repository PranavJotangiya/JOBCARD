import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** "Empty" state for a loaded-but-nothing panel. Projects action buttons. */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty">
      <div class="empty__icon" aria-hidden="true">{{ icon() }}</div>
      <h3 class="empty__title">{{ title() }}</h3>
      @if (message()) {
        <p class="empty__msg">{{ message() }}</p>
      }
      <div class="empty__actions"><ng-content /></div>
    </div>
  `,
  styles: [
    `
      .empty {
        text-align: center;
        padding: 2.5rem 1.25rem;
        color: var(--color-text-secondary);
      }
      .empty__icon { font-size: 2.75rem; margin-bottom: 0.5rem; }
      .empty__title { margin: 0 0 0.35rem; color: var(--color-text); font-size: 1.05rem; }
      .empty__msg { margin: 0 auto 1rem; max-width: 30ch; font-size: 0.9rem; }
      .empty__actions:empty { display: none; }
      .empty__actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
    `,
  ],
})
export class EmptyState {
  readonly icon = input('📭');
  readonly title = input('Nothing here yet');
  readonly message = input<string | null>(null);
}
