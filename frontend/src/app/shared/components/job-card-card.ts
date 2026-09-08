import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { StatusBadge } from './status-badge';
import type { JobCard } from '../../core/models/jobcard.model';

/**
 * Touch-friendly Job Card summary card for list / dashboard.
 * The whole card is the tap target (routes to the detail).
 */
@Component({
  selector: 'app-job-card-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, DecimalPipe, StatusBadge],
  template: `
    <a class="jcc" [routerLink]="['/jobcards', card().id]">
      <div class="jcc__top">
        <span class="jcc__num">{{ card().jobCardNumber }}</span>
        <app-status-badge [work]="card().workStatus" [dispatch]="card().dispatchStatus" />
      </div>
      <div class="jcc__party">{{ counterpartyName() }}</div>
      <div class="jcc__meta">
        <span class="jcc__pcs">{{ card().totals.pieces | number }} PCS</span>
        <span class="jcc__date">{{ card().jobCardDate | date: 'dd MMM yyyy' }}</span>
      </div>
    </a>
  `,
  styles: [
    `
      .jcc {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        padding: 1rem;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        text-decoration: none;
        color: inherit;
        box-shadow: var(--shadow-xs);
      }
      .jcc:active { background: var(--color-surface-alt); }
      .jcc__top { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
      .jcc__num { font-weight: 800; font-size: 1rem; color: var(--color-primary-strong); }
      .jcc__party { font-weight: 600; font-size: 0.95rem; }
      .jcc__meta {
        display: flex; justify-content: space-between; gap: 0.75rem;
        font-size: 0.82rem; color: var(--color-text-secondary);
      }
      .jcc__pcs { font-weight: 700; color: var(--color-text); }
    `,
  ],
})
export class JobCardCard {
  readonly card = input.required<JobCard>();
  /** which side to show as the headline — the "other" party for this viewer */
  readonly show = input<'manufacturer' | 'jobber' | 'auto'>('auto');
  readonly viewerRole = input<'JOBBER' | 'MANUFACTURER' | 'ADMIN' | null>(null);

  readonly counterpartyName = computed(() => {
    const c = this.card();
    const mode = this.show();
    if (mode === 'manufacturer') return c.manufacturer.name ?? '—';
    if (mode === 'jobber') return c.jobber.name ?? '—';
    // auto: a Jobber cares about the Manufacturer; a Manufacturer about the Jobber
    return this.viewerRole() === 'MANUFACTURER'
      ? (c.jobber.name ?? '—')
      : (c.manufacturer.name ?? '—');
  });
}
