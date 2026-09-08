import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { JobcardService } from '../../jobcard.service';
import { NotificationService } from '../../../core/services/notification.service';
import { JobcardForm } from '../../components/jobcard-form';
import { PageHeader } from '../../../shared/components/page-header';
import { EmptyState } from '../../../shared/components/empty-state';
import { LoadingSkeleton } from '../../../shared/components/loading-skeleton';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import type { JobCard, UpdateJobCardPayload } from '../../../core/models/jobcard.model';
import type { AppError } from '../../../core/models/api.model';

@Component({
  selector: 'app-jobcard-edit',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, JobcardForm, PageHeader, EmptyState, LoadingSkeleton, TranslatePipe],
  templateUrl: './jobcard-edit.html',
})
export class JobcardEdit {
  private readonly service = inject(JobcardService);
  private readonly notify = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  readonly jobCard = signal<JobCard | null>(null);
  readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  readonly submitting = signal(false);

  constructor() {
    this.service
      .getById(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ jobCard }) => {
          this.jobCard.set(jobCard);
          this.state.set('ready');
        },
        error: () => this.state.set('error'),
      });
  }

  onSave(payload: UpdateJobCardPayload): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.service
      .update(this.id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ jobCard }) => {
          this.notify.success('Job Card updated');
          void this.router.navigate(['/jobcards', jobCard.id]);
        },
        error: (e: AppError) => {
          this.submitting.set(false);
          this.notify.error(e.message);
        },
      });
  }

  cancel(): void {
    void this.router.navigate(['/jobcards', this.id]);
  }
}
