import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { JobcardService } from '../../jobcard.service';
import { ManufacturerService } from '../../../jobber/manufacturer.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TranslationService } from '../../../core/i18n/translation.service';
import { JobcardForm } from '../../components/jobcard-form';
import { PageHeader } from '../../../shared/components/page-header';
import { EmptyState } from '../../../shared/components/empty-state';
import { LoadingSkeleton } from '../../../shared/components/loading-skeleton';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import type { Manufacturer } from '../../../core/models/contact.model';
import type { CreateJobCardPayload } from '../../../core/models/jobcard.model';
import type { AppError } from '../../../core/models/api.model';

@Component({
  selector: 'app-jobcard-create',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, JobcardForm, PageHeader, EmptyState, LoadingSkeleton, TranslatePipe],
  templateUrl: './jobcard-create.html',
})
export class JobcardCreate {
  private readonly jobcards = inject(JobcardService);
  private readonly manufacturers = inject(ManufacturerService);
  private readonly notify = inject(NotificationService);
  private readonly i18n = inject(TranslationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly options = signal<Manufacturer[]>([]);
  readonly state = signal<'loading' | 'no-manufacturers' | 'ready' | 'error'>('loading');
  readonly selectedId = signal<string>('');
  readonly submitting = signal(false);

  constructor() {
    this.manufacturers
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ items }) => {
          this.options.set(items);
          this.state.set(items.length ? 'ready' : 'no-manufacturers');
        },
        error: () => this.state.set('error'),
      });
  }

  onSelect(id: string): void {
    this.selectedId.set(id);
  }

  onSave(payload: Omit<CreateJobCardPayload, 'manufacturerId'>): void {
    if (!this.selectedId() || this.submitting()) return;
    this.submitting.set(true);
    this.jobcards
      .create({ ...payload, manufacturerId: this.selectedId() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ jobCard }) => {
          this.notify.success(this.i18n.translate('jobcard.created'));
          void this.router.navigate(['/jobcards', jobCard.id]);
        },
        error: (e: AppError) => {
          this.submitting.set(false);
          // form stays mounted — nothing typed is lost
          this.notify.error(e.message);
        },
      });
  }

  cancel(): void {
    void this.router.navigate(['/jobcards']);
  }
}
