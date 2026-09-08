import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  DISPATCH_STATUS_LABEL,
  WORK_STATUS_LABEL,
  type DispatchStatus,
  type WorkStatus,
} from '../../core/models/jobcard.model';

type Tone = 'draft' | 'ready' | 'progress' | 'completed' | 'cancelled' | 'dispatched';

const WORK_TONE: Record<WorkStatus, Tone> = {
  DRAFT: 'draft',
  READY: 'ready',
  IN_PROGRESS: 'progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [attr.data-tone]="tone()">{{ label() }}</span>`,
  styles: [
    `
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 0.2rem 0.6rem;
        border-radius: var(--radius-pill);
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      [data-tone='draft']    { background: var(--tone-draft-bg);    color: var(--tone-draft-fg); }
      [data-tone='ready']    { background: var(--tone-ready-bg);    color: var(--tone-ready-fg); }
      [data-tone='progress'] { background: var(--tone-progress-bg); color: var(--tone-progress-fg); }
      [data-tone='completed']{ background: var(--tone-completed-bg);color: var(--tone-completed-fg); }
      [data-tone='cancelled']{ background: var(--tone-cancelled-bg);color: var(--tone-cancelled-fg); }
      [data-tone='dispatched']{background: var(--tone-dispatched-bg);color: var(--tone-dispatched-fg); }
    `,
  ],
})
export class StatusBadge {
  readonly work = input<WorkStatus | null>(null);
  readonly dispatch = input<DispatchStatus | null>(null);

  readonly tone = computed<Tone>(() => {
    if (this.dispatch() === 'DISPATCHED') return 'dispatched';
    const w = this.work();
    return w ? WORK_TONE[w] : 'draft';
  });

  readonly label = computed(() => {
    if (this.dispatch() === 'DISPATCHED') return DISPATCH_STATUS_LABEL.DISPATCHED;
    const w = this.work();
    return w ? WORK_STATUS_LABEL[w] : '';
  });
}
