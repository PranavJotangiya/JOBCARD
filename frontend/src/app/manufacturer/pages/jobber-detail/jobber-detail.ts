import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { JobberContactsService } from '../../jobber-contacts.service';
import { JobcardService } from '../../../jobcards/jobcard.service';
import { PageHeader } from '../../../shared/components/page-header';
import { SummaryStat } from '../../../shared/components/summary-stat';
import { JobCardCard } from '../../../shared/components/job-card-card';
import { EmptyState } from '../../../shared/components/empty-state';
import { LoadingSkeleton } from '../../../shared/components/loading-skeleton';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import type { Jobber, ContactStats } from '../../../core/models/contact.model';
import type { JobCard } from '../../../core/models/jobcard.model';

@Component({
  selector: 'app-jobber-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageHeader,
    SummaryStat,
    JobCardCard,
    EmptyState,
    LoadingSkeleton,
    TranslatePipe,
  ],
  templateUrl: './jobber-detail.html',
  styles: [
    `
      .jd__stats {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.6rem;
        margin-bottom: 1.25rem;
      }
      .jd__h { font-size: 1.05rem; margin: 0 0 0.6rem; }
      @media (min-width: 640px) {
        .jd__stats { grid-template-columns: repeat(5, 1fr); }
      }
    `,
  ],
})
export class JobberDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly contacts = inject(JobberContactsService);
  private readonly jobcards = inject(JobcardService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  readonly jobber = signal<Jobber | null>(null);
  readonly stats = signal<ContactStats | null>(null);
  readonly cards = signal<JobCard[]>([]);
  readonly state = signal<'loading' | 'ready' | 'error'>('loading');

  constructor() {
    forkJoin({
      detail: this.contacts.getWithStats(this.id),
      list: this.jobcards.list({ jobberId: this.id, limit: 50 }),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ detail, list }) => {
          this.jobber.set(detail.jobber);
          this.stats.set(detail.stats);
          this.cards.set(list.items);
          this.state.set('ready');
        },
        error: () => this.state.set('error'),
      });
  }
}
