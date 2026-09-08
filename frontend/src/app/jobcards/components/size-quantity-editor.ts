import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { SizeQuantity } from '../../core/models/jobcard.model';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

const DEFAULT_SIZES = ['6', '8', '10', '12', '14', '16', '18', '20'];

/**
 * Size-wise quantity entry.
 *
 * Mobile-first: large touch rows (never a cramped grid on phones); a table-like
 * layout only kicks in from tablet width. Bulk Fill / Fill All / Clear All, plus
 * custom sizes. Total PCS + Average are calculated read-only values.
 */
@Component({
  selector: 'app-size-quantity-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, TranslatePipe],
  templateUrl: './size-quantity-editor.html',
  styleUrl: './size-quantity-editor.scss',
})
export class SizeQuantityEditor {
  /** two-way bound list of sizes; seeded with a default set when empty */
  readonly value = model<SizeQuantity[]>([]);
  readonly disabled = input(false);

  readonly rows = computed<SizeQuantity[]>(() => {
    const v = this.value();
    if (v.length) return v;
    return DEFAULT_SIZES.map((size) => ({ size, quantity: 0 }));
  });

  readonly totalPcs = computed(() => this.rows().reduce((s, r) => s + (Number(r.quantity) || 0), 0));
  readonly average = computed(() => {
    const filled = this.rows().filter((r) => Number(r.quantity) > 0);
    return filled.length ? this.totalPcs() / filled.length : 0;
  });

  private commit(rows: SizeQuantity[]): void {
    this.value.set(rows.map((r) => ({ size: r.size, quantity: Math.max(0, Math.floor(Number(r.quantity) || 0)) })));
  }

  onQtyInput(index: number, raw: string): void {
    const rows = this.rows().map((r, i) => (i === index ? { ...r, quantity: Number(raw) || 0 } : r));
    this.commit(rows);
  }

  addSize(size: string): void {
    const name = size.trim();
    if (!name || this.rows().some((r) => r.size === name)) return;
    this.commit([...this.rows(), { size: name, quantity: 0 }]);
  }

  removeSize(index: number): void {
    this.commit(this.rows().filter((_, i) => i !== index));
  }

  fillAll(qtyRaw: string): void {
    const qty = Number(qtyRaw) || 0;
    this.commit(this.rows().map((r) => ({ ...r, quantity: qty })));
  }

  bulkFillEmpty(qtyRaw: string): void {
    const qty = Number(qtyRaw) || 0;
    this.commit(this.rows().map((r) => (r.quantity > 0 ? r : { ...r, quantity: qty })));
  }

  clearAll(): void {
    this.commit(this.rows().map((r) => ({ ...r, quantity: 0 })));
  }
}
