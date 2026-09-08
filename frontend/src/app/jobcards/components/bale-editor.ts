import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { BaleRoll } from '../../core/models/jobcard.model';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/** Multiple Bale/Roll records — stacked cards on mobile, never a complex table. */
@Component({
  selector: 'app-bale-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, TranslatePipe],
  template: `
    <div class="be">
      <ul class="be__list">
        @for (bale of value(); track $index; let i = $index) {
          <li class="be__card">
            <div class="field be__f">
              <label [attr.for]="'bl' + i">Label</label>
              <input
                [id]="'bl' + i"
                class="input"
                [value]="bale.label"
                [disabled]="disabled()"
                (input)="patch(i, 'label', $any($event.target).value)"
              />
            </div>
            <div class="field be__f">
              <label [attr.for]="'bm' + i">Meters</label>
              <input
                [id]="'bm' + i"
                class="input"
                type="number"
                inputmode="decimal"
                min="0"
                [value]="bale.meters"
                [disabled]="disabled()"
                (input)="patch(i, 'meters', $any($event.target).value)"
              />
            </div>
            <button
              type="button"
              class="be__del"
              [disabled]="disabled()"
              aria-label="Remove bale"
              (click)="remove(i)"
            >
              ✕
            </button>
          </li>
        }
      </ul>

      <button type="button" class="btn btn--sm btn--outline" [disabled]="disabled()" (click)="add()">
        {{ 'jobcard.addBale' | t }}
      </button>

      <div class="be__totals">
        <div class="is-calculated">
          <span>{{ 'jobcard.baleCount' | t }}</span><strong>{{ value().length }}</strong>
        </div>
        <div class="is-calculated">
          <span>{{ 'jobcard.baleMtr' | t }}</span><strong>{{ totalMtr() | number: '1.0-2' }}</strong>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .be__list { list-style: none; margin: 0 0 0.75rem; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
      .be__card {
        display: grid;
        grid-template-columns: 1fr 7rem 44px;
        gap: 0.5rem;
        align-items: end;
        padding: 0.6rem;
        background: var(--color-surface-alt);
        border-radius: var(--radius-sm);
      }
      .be__f { margin: 0; }
      .be__f label { font-size: 0.72rem; }
      .be__f .input { min-height: 44px; }
      .be__del { width: 44px; height: 44px; border: 0; border-radius: 50%; background: var(--color-surface); color: var(--color-text-faint); cursor: pointer; }
      .be__totals { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-top: 0.9rem; }
      .be__totals .is-calculated { display: flex; flex-direction: column; gap: 0.1rem; padding: 0.55rem 0.7rem; border-radius: var(--radius-sm); }
      .be__totals span { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.03em; }
      .be__totals strong { font-size: 1.1rem; color: var(--color-text); }
      @media (max-width: 360px) {
        .be__card { grid-template-columns: 1fr 5rem 40px; }
      }
    `,
  ],
})
export class BaleEditor {
  readonly value = model<BaleRoll[]>([]);
  readonly disabled = input(false);

  readonly totalMtr = computed(() =>
    this.value().reduce((s, b) => s + (Number(b.meters) || 0), 0),
  );

  add(): void {
    const n = this.value().length + 1;
    this.value.set([
      ...this.value(),
      { label: `Bale ${String(n).padStart(2, '0')}`, meters: 0 },
    ]);
  }

  remove(index: number): void {
    this.value.set(this.value().filter((_, i) => i !== index));
  }

  patch(index: number, key: 'label' | 'meters', raw: string): void {
    this.value.set(
      this.value().map((b, i) =>
        i === index
          ? { ...b, [key]: key === 'meters' ? Math.max(0, Number(raw) || 0) : raw }
          : b,
      ),
    );
  }
}
