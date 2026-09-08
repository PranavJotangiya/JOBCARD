import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ManufacturerService } from '../../manufacturer.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeader } from '../../../shared/components/page-header';
import { EmptyState } from '../../../shared/components/empty-state';
import { LoadingSkeleton } from '../../../shared/components/loading-skeleton';
import { BottomSheet } from '../../../shared/components/bottom-sheet';
import { ContactCard } from '../../../shared/components/contact-card';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import type { Manufacturer } from '../../../core/models/contact.model';
import type { AppError } from '../../../core/models/api.model';

@Component({
  selector: 'app-manufacturer-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    PageHeader,
    EmptyState,
    LoadingSkeleton,
    BottomSheet,
    ContactCard,
    TranslatePipe,
  ],
  templateUrl: './manufacturer-list.html',
})
export class ManufacturerList {
  private readonly service = inject(ManufacturerService);
  private readonly notify = inject(NotificationService);
  private readonly i18n = inject(TranslationService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<Manufacturer[]>([]);
  readonly state = signal<'loading' | 'ready' | 'empty' | 'error'>('loading');
  readonly sheetOpen = signal(false);
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(160)]],
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.service
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ items }) => {
          this.items.set(items);
          this.state.set(items.length ? 'ready' : 'empty');
        },
        error: () => this.state.set('error'),
      });
  }

  openSheet(): void {
    this.form.reset({ name: '' });
    this.sheetOpen.set(true);
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.service
      .add(this.form.getRawValue().name.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.sheetOpen.set(false);
          this.notify.success(this.i18n.translate('manufacturer.added'));
          this.load();
        },
        error: (e: AppError) => {
          this.saving.set(false);
          this.notify.error(e.message);
        },
      });
  }
}
