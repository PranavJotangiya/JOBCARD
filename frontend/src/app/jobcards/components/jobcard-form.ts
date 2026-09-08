import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { SectionCard } from '../../shared/components/section-card';
import { StickyActionBar } from '../../shared/components/sticky-action-bar';
import { SizeQuantityEditor } from './size-quantity-editor';
import { BaleEditor } from './bale-editor';
import { PatternImageUpload } from './pattern-image-upload';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type {
  BaleRoll,
  CreateJobCardPayload,
  JobCard,
  SizeQuantity,
} from '../../core/models/jobcard.model';

type FormPayload = Omit<CreateJobCardPayload, 'manufacturerId'>;

/**
 * The Job Card create/edit form.
 *
 * Reactive Forms with mobile-first, single-column, collapsible sections and a
 * sticky Save/Cancel bar. Client-side validation is UX only — the backend
 * re-validates every field. On a failed save the parent keeps this form mounted
 * so nothing the user typed is lost.
 */
@Component({
  selector: 'app-jobcard-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    SectionCard,
    StickyActionBar,
    SizeQuantityEditor,
    BaleEditor,
    PatternImageUpload,
    TranslatePipe,
  ],
  templateUrl: './jobcard-form.html',
  styleUrl: './jobcard-form.scss',
})
export class JobcardForm {
  private readonly fb = inject(FormBuilder);

  readonly mode = input<'create' | 'edit'>('create');
  readonly initial = input<JobCard | null>(null);
  readonly submitting = input(false);

  readonly save = output<FormPayload>();
  readonly formCancel = output<void>();

  readonly sizes = signal<SizeQuantity[]>([]);
  readonly bales = signal<BaleRoll[]>([]);
  readonly patternFileId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    jobCardDate: [todayIso()],
    shortNumber: [''],
    shortName: [''],
    programDate: [''],
    cuttingDate: [''],
    fabric: this.fb.nonNullable.group({
      fabricType: [''],
      color: [''],
      description: [''],
      pana: [null as number | null],
      mtr: [null as number | null],
      average: [null as number | null],
      pcs: [null as number | null],
    }),
    cutting: this.fb.nonNullable.group({
      pattern: [''],
      markerLength: [null as number | null],
      markerWidth: [null as number | null],
      layLength: [null as number | null],
      layers: [null as number | null],
      plies: [null as number | null],
    }),
    notes: [''],
  });

  readonly existingPatternUrl = computed(() => this.initial()?.cutting.patternImageUrl ?? null);

  constructor() {
    effect(() => {
      const jc = this.initial();
      if (!jc) return;
      this.form.patchValue({
        jobCardDate: toDateInput(jc.jobCardDate),
        shortNumber: jc.shortNumber ?? '',
        shortName: jc.shortName ?? '',
        programDate: toDateInput(jc.programDate),
        cuttingDate: toDateInput(jc.cuttingDate),
        fabric: {
          fabricType: jc.fabric.fabricType ?? '',
          color: jc.fabric.color ?? '',
          description: jc.fabric.description ?? '',
          pana: jc.fabric.pana ?? null,
          mtr: jc.fabric.mtr ?? null,
          average: jc.fabric.average ?? null,
          pcs: jc.fabric.pcs ?? null,
        },
        cutting: {
          pattern: jc.cutting.pattern ?? '',
          markerLength: jc.cutting.markerLength ?? null,
          markerWidth: jc.cutting.markerWidth ?? null,
          layLength: jc.cutting.layLength ?? null,
          layers: jc.cutting.layers ?? null,
          plies: jc.cutting.plies ?? null,
        },
        notes: jc.notes ?? '',
      });
      this.sizes.set(jc.sizes.map((s) => ({ ...s })));
      this.bales.set(jc.bales.map((b) => ({ ...b })));
      this.patternFileId.set(jc.cutting.patternImageFileId);
    });

    effect(() => {
      if (this.submitting()) this.form.disable({ emitEvent: false });
      else this.form.enable({ emitEvent: false });
    });
  }

  onSubmit(): void {
    if (this.submitting()) return;

    const raw = this.form.getRawValue();
    const prune = (obj: Record<string, unknown>): Record<string, unknown> => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v !== '' && v !== null && v !== undefined) out[k] = v;
      }
      return out;
    };

    const payload: FormPayload = {
      jobCardDate: fromDateInput(raw.jobCardDate),
      shortNumber: raw.shortNumber || undefined,
      shortName: raw.shortName || undefined,
      programDate: raw.programDate ? fromDateInput(raw.programDate) : null,
      cuttingDate: raw.cuttingDate ? fromDateInput(raw.cuttingDate) : null,
      fabric: prune(raw.fabric) as FormPayload['fabric'],
      cutting: {
        ...prune(raw.cutting),
        patternImageFileId: this.patternFileId(),
      } as FormPayload['cutting'],
      sizes: this.sizes().filter((s) => s.quantity > 0),
      bales: this.bales().filter((b) => b.label.trim().length > 0),
      notes: raw.notes || undefined,
    };
    this.save.emit(payload);
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function toDateInput(iso: string | null): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : '';
}
function fromDateInput(value: string): string {
  return value ? new Date(value + 'T00:00:00').toISOString() : new Date().toISOString();
}
