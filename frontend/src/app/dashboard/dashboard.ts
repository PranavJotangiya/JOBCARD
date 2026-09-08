import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DashboardService } from './dashboard.service';
import { AuthService } from '../core/services/auth.service';
import { SummaryStat } from '../shared/components/summary-stat';
import { JobCardCard } from '../shared/components/job-card-card';
import { ContactCard } from '../shared/components/contact-card';
import { EmptyState } from '../shared/components/empty-state';
import { LoadingSkeleton } from '../shared/components/loading-skeleton';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import type { DashboardData } from '../core/models/dashboard.model';
import type { AppError } from '../core/models/api.model';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    SummaryStat,
    JobCardCard,
    ContactCard,
    EmptyState,
    LoadingSkeleton,
    TranslatePipe,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly service = inject(DashboardService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = signal<DashboardData | null>(null);
  readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  readonly errorMsg = signal<string | null>(null);

  readonly role = computed(() => this.data()?.role ?? this.auth.role());
  readonly isJobber = computed(() => this.role() === 'JOBBER');
  readonly isManufacturer = computed(() => this.role() === 'MANUFACTURER');

  constructor() {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.service
      .get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => {
          this.data.set(d);
          this.state.set('ready');
        },
        error: (e: AppError) => {
          this.errorMsg.set(e.message);
          this.state.set('error');
        },
      });
  }
}
