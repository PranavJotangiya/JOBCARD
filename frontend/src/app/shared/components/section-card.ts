import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

/**
 * A titled content section. On the Job Card detail it acts as an accordion
 * (`collapsible`); in the form it is always open. Content is projected.
 */
@Component({
  selector: 'app-section-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="sc">
      <button
        type="button"
        class="sc__head"
        [attr.aria-expanded]="open()"
        [disabled]="!collapsible()"
        (click)="toggle()"
      >
        <span class="sc__title">
          @if (icon()) {
            <span class="sc__icon" aria-hidden="true">{{ icon() }}</span>
          }
          {{ title() }}
        </span>
        @if (collapsible()) {
          <span class="sc__chev" [class.is-open]="open()" aria-hidden="true">⌄</span>
        }
      </button>
      @if (open()) {
        <div class="sc__body">
          <ng-content />
        </div>
      }
    </section>
  `,
  styles: [
    `
      .sc {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        overflow: hidden;
      }
      .sc__head {
        width: 100%;
        min-height: var(--tap-target);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.85rem 1rem;
        border: 0;
        background: transparent;
        font: inherit;
        font-weight: 700;
        color: var(--color-text);
        cursor: pointer;
        text-align: left;
      }
      .sc__head:disabled { cursor: default; }
      .sc__title { display: flex; align-items: center; gap: 0.5rem; font-size: 0.98rem; }
      .sc__chev { font-size: 1.1rem; transition: transform 0.15s ease; }
      .sc__chev.is-open { transform: rotate(180deg); }
      .sc__body { padding: 0 1rem 1rem; }
    `,
  ],
})
export class SectionCard {
  readonly title = input.required<string>();
  readonly icon = input<string | null>(null);
  readonly collapsible = input(false);
  readonly startOpen = input(true);

  private readonly _open = signal(true);
  open = this._open.asReadonly();

  constructor() {
    queueMicrotask(() => {
      if (this.collapsible() && !this.startOpen()) this._open.set(false);
    });
  }

  toggle(): void {
    if (this.collapsible()) this._open.update((v) => !v);
  }
}
