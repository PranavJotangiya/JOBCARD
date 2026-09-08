import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DatePipe } from '@angular/common';
import { JobcardService } from '../../jobcard.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog.service';
import { SectionCard } from '../../../shared/components/section-card';
import { StatusBadge } from '../../../shared/components/status-badge';
import { StickyActionBar } from '../../../shared/components/sticky-action-bar';
import { EmptyState } from '../../../shared/components/empty-state';
import { LoadingSkeleton } from '../../../shared/components/loading-skeleton';
import { StatusActions } from '../../components/status-actions';
import { ActivityTimeline } from '../../components/activity-timeline';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import type { ActivityEntry, JobCard } from '../../../core/models/jobcard.model';
import type { AppError } from '../../../core/models/api.model';

@Component({
  selector: 'app-jobcard-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    DatePipe,
    SectionCard,
    StatusBadge,
    StickyActionBar,
    EmptyState,
    LoadingSkeleton,
    StatusActions,
    ActivityTimeline,
    TranslatePipe,
  ],
  templateUrl: './jobcard-detail.html',
  styleUrl: './jobcard-detail.scss',
})
export class JobcardDetail {
  private readonly service = inject(JobcardService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  readonly jobCard = signal<JobCard | null>(null);
  readonly activity = signal<ActivityEntry[]>([]);
  readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  readonly errorMsg = signal<string | null>(null);
  readonly pdfBusy = signal(false);

  readonly isJobber = computed(() => this.auth.hasRole('JOBBER'));
  readonly readOnly = computed(() => this.auth.hasRole('MANUFACTURER'));

  constructor() {
    this.load();
  }

  private load(): void {
    this.state.set('loading');
    forkJoin({
      detail: this.service.getById(this.id),
      activity: this.service.activity(this.id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ detail, activity }) => {
          this.jobCard.set(detail.jobCard);
          this.activity.set(activity.activity);
          this.state.set('ready');
        },
        error: (e: AppError) => {
          this.errorMsg.set(e.message);
          this.state.set('error');
        },
      });
  }

  retry(): void {
    this.load();
  }

  onStatusChanged(updated: JobCard): void {
    this.jobCard.set(updated);
    this.service
      .activity(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: ({ activity }) => this.activity.set(activity), error: () => undefined });
  }

  async remove(): Promise<void> {
    const jc = this.jobCard();
    if (!jc) return;
    const ok = await this.confirm.ask({
      title: `Delete ${jc.jobCardNumber}?`,
      message: 'It can be restored by an administrator.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    this.service.remove(jc.id).subscribe({
      next: () => {
        this.notify.success('Job Card deleted');
        void this.router.navigate(['/jobcards']);
      },
      error: (e: AppError) => this.notify.error(e.message),
    });
  }

  openPdf(): void {
    if (this.pdfBusy()) return;
    this.pdfBusy.set(true);
    this.service.pdfBlob(this.id).subscribe({
      next: (blob) => {
        this.pdfBusy.set(false);
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (e: AppError) => {
        this.pdfBusy.set(false);
        this.notify.error(e.message);
      },
    });
  }

  async share(): Promise<void> {
    const jc = this.jobCard();
    if (!jc) return;
    const url = window.location.href;
    const shareData = {
      title: `JOBCARD ${jc.jobCardNumber}`,
      text: `${jc.jobCardNumber} · ${jc.manufacturer.name} → ${jc.jobber.name}`,
      url,
    };
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share(shareData);
      } catch {
        /* user cancelled */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      this.notify.success('Link copied');
    } catch {
      this.notify.info(url);
    }
  }
}
