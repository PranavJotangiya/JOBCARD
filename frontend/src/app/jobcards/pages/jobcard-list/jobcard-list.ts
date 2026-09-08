import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { JobcardService } from '../../jobcard.service';
import { AuthService } from '../../../core/services/auth.service';
import { PageHeader } from '../../../shared/components/page-header';
import { SearchBar } from '../../../shared/components/search-bar';
import { FilterChips, type Chip } from '../../../shared/components/filter-chips';
import { JobCardCard } from '../../../shared/components/job-card-card';
import { EmptyState } from '../../../shared/components/empty-state';
import { LoadingSkeleton } from '../../../shared/components/loading-skeleton';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import type { JobCard, StatusBucket } from '../../../core/models/jobcard.model';
import type { Pagination, AppError } from '../../../core/models/api.model';

/**
 * Job Card list. Search / filter chip / page all live in the URL query string so
 * the view is shareable and restores on refresh. Filtering, searching and
 * pagination are ALL server-side (no big client-side arrays).
 */
@Component({
  selector: 'app-jobcard-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageHeader,
    SearchBar,
    FilterChips,
    JobCardCard,
    EmptyState,
    LoadingSkeleton,
    TranslatePipe,
  ],
  templateUrl: './jobcard-list.html',
  styleUrl: './jobcard-list.scss',
})
export class JobcardList {
  private readonly service = inject(JobcardService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly i18n = inject(TranslationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly cards = signal<JobCard[]>([]);
  readonly pagination = signal<Pagination | null>(null);
  readonly state = signal<'loading' | 'ready' | 'empty' | 'error'>('loading');
  readonly errorMsg = signal<string | null>(null);

  readonly search = signal('');
  readonly bucket = signal<StatusBucket>('all');
  private page = 1;

  readonly canCreate = computed(() => this.auth.hasRole('JOBBER'));
  readonly viewerRole = computed(() => this.auth.role());

  readonly chips = computed<Chip[]>(() => [
    { value: 'all', label: this.i18n.translate('filter.all') },
    { value: 'pending', label: this.i18n.translate('filter.pending') },
    { value: 'in_progress', label: this.i18n.translate('filter.inProgress') },
    { value: 'completed', label: this.i18n.translate('filter.completed') },
    { value: 'dispatched', label: this.i18n.translate('filter.dispatched') },
  ]);

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
      this.page = Math.max(1, Number(p.get('page')) || 1);
      this.search.set(p.get('search') ?? '');
      this.bucket.set((p.get('bucket') as StatusBucket) || 'all');
      this.load();
    });
  }

  private load(): void {
    this.state.set('loading');
    this.errorMsg.set(null);
    this.service
      .list({
        page: this.page,
        limit: 20,
        search: this.search() || undefined,
        bucket: this.bucket(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ items, pagination }) => {
          this.cards.set(items);
          this.pagination.set(pagination);
          this.state.set(items.length ? 'ready' : 'empty');
        },
        error: (e: AppError) => {
          this.errorMsg.set(e.message);
          this.state.set('error');
        },
      });
  }

  private patchQuery(changes: Record<string, string | number | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: changes,
      queryParamsHandling: 'merge',
    });
  }

  onSearch(term: string): void {
    this.patchQuery({ search: term || null, page: null });
  }
  onBucket(value: string): void {
    this.patchQuery({ bucket: value === 'all' ? null : value, page: null });
  }
  nextPage(): void {
    if (this.pagination()?.hasNextPage) this.patchQuery({ page: this.page + 1 });
  }
  prevPage(): void {
    if (this.pagination()?.hasPrevPage) this.patchQuery({ page: this.page - 1 });
  }
  retry(): void {
    this.load();
  }
}
