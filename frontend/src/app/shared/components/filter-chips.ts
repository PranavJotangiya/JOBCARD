import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface Chip {
  value: string;
  label: string;
}

/** Horizontally-scrollable single-select filter chips. */
@Component({
  selector: 'app-filter-chips',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chips" role="tablist" aria-label="Filter">
      @for (chip of chips(); track chip.value) {
        <button
          type="button"
          role="tab"
          class="chip"
          [class.is-active]="chip.value === active()"
          [attr.aria-selected]="chip.value === active()"
          (click)="select.emit(chip.value)"
        >
          {{ chip.label }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      .chips {
        display: flex;
        gap: 0.5rem;
        overflow-x: auto;
        padding: 0.15rem 0.1rem 0.4rem;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
      }
      .chips::-webkit-scrollbar { display: none; }
      .chip {
        flex: 0 0 auto;
        min-height: 40px;
        padding: 0 0.95rem;
        border-radius: var(--radius-pill);
        border: 1.5px solid var(--color-border-strong);
        background: var(--color-surface);
        color: var(--color-text-secondary);
        font: inherit;
        font-weight: 600;
        font-size: 0.85rem;
        cursor: pointer;
        white-space: nowrap;
      }
      .chip.is-active {
        background: var(--color-primary);
        border-color: var(--color-primary);
        color: var(--color-primary-contrast);
      }
    `,
  ],
})
export class FilterChips {
  readonly chips = input.required<Chip[]>();
  readonly active = input.required<string>();
  readonly select = output<string>();
}
