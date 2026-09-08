import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A single KPI tile used in dashboard summary rows. */
@Component({
  selector: 'app-summary-stat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stat" [attr.data-tone]="tone()">
      <span class="stat__value">{{ value() }}</span>
      <span class="stat__label">{{ label() }}</span>
    </div>
  `,
  styles: [
    `
      .stat {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: 0.8rem 0.7rem;
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        min-width: 0;
      }
      .stat__value { font-size: 1.4rem; font-weight: 800; line-height: 1.1; }
      .stat__label {
        font-size: 0.72rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: var(--color-text-secondary);
      }
      [data-tone='primary'] .stat__value { color: var(--color-primary-strong); }
      [data-tone='progress'] .stat__value { color: var(--tone-progress-fg); }
      [data-tone='completed'] .stat__value { color: var(--tone-completed-fg); }
      [data-tone='dispatched'] .stat__value { color: var(--tone-dispatched-fg); }
    `,
  ],
})
export class SummaryStat {
  readonly value = input.required<number | string>();
  readonly label = input.required<string>();
  readonly tone = input<'default' | 'primary' | 'progress' | 'completed' | 'dispatched'>('default');
}
