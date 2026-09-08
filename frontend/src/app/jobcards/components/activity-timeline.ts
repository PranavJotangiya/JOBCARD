import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HumanizePipe } from '../../shared/pipes/humanize.pipe';
import type { ActivityEntry } from '../../core/models/jobcard.model';

interface DayGroup {
  label: string;
  entries: ActivityEntry[];
}

/** Activity timeline grouped by day (Today / Yesterday / date). */
@Component({
  selector: 'app-activity-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, HumanizePipe],
  template: `
    @if (groups().length === 0) {
      <p class="muted text-sm">No activity yet.</p>
    }
    @for (g of groups(); track g.label) {
      <div class="at__group">
        <div class="at__day">{{ g.label }}</div>
        <ul class="at__list">
          @for (e of g.entries; track e.id) {
            <li class="at__item">
              <span class="at__dot" aria-hidden="true"></span>
              <div class="at__body">
                <span class="at__action">{{ e.action | humanize }}</span>
                <span class="at__meta">
                  {{ e.createdAt | date: 'HH:mm' }}
                  @if (e.actorName) {
                    · {{ e.actorName }}
                  }
                </span>
              </div>
            </li>
          }
        </ul>
      </div>
    }
  `,
  styles: [
    `
      .at__group { margin-bottom: 1rem; }
      .at__day {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--color-text-secondary);
        margin-bottom: 0.4rem;
      }
      .at__list { list-style: none; margin: 0; padding: 0; }
      .at__item { display: flex; gap: 0.65rem; padding: 0.35rem 0; }
      .at__dot {
        width: 10px; height: 10px; margin-top: 0.35rem; flex: 0 0 10px;
        border-radius: 50%; background: var(--color-primary);
      }
      .at__body { display: flex; flex-direction: column; }
      .at__action { font-weight: 600; font-size: 0.9rem; }
      .at__meta { font-size: 0.78rem; color: var(--color-text-secondary); }
    `,
  ],
})
export class ActivityTimeline {
  readonly entries = input.required<ActivityEntry[]>();

  readonly groups = computed<DayGroup[]>(() => {
    const byDay = new Map<string, ActivityEntry[]>();
    for (const e of this.entries()) {
      const key = new Date(e.createdAt).toDateString();
      (byDay.get(key) ?? byDay.set(key, []).get(key)!).push(e);
    }
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86_400_000).toDateString();
    return [...byDay.entries()].map(([key, entries]) => ({
      label: key === today ? 'Today' : key === yesterday ? 'Yesterday' : key,
      entries,
    }));
  });
}
