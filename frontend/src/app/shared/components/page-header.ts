import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Page title block. Right-side actions projected via `[actions]`. */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="ph">
      <div class="ph__text">
        <h1 class="ph__title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="ph__sub">{{ subtitle() }}</p>
        }
      </div>
      <div class="ph__actions"><ng-content select="[actions]" /></div>
    </header>
  `,
  styles: [
    `
      .ph {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .ph__title { margin: 0; font-size: 1.3rem; font-weight: 800; }
      .ph__sub { margin: 0.15rem 0 0; color: var(--color-text-secondary); font-size: 0.85rem; }
      .ph__actions { display: flex; gap: 0.4rem; flex-shrink: 0; }
      .ph__actions:empty { display: none; }
    `,
  ],
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
}
