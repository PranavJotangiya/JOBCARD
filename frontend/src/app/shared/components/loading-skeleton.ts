import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Content placeholder shown while data loads — never a blank screen. */
@Component({
  selector: 'app-loading-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sk" aria-hidden="true">
      @for (row of rows(); track $index) {
        <div class="sk__card">
          <div class="sk__line sk__line--title"></div>
          <div class="sk__line"></div>
          <div class="sk__line sk__line--short"></div>
        </div>
      }
    </div>
    <span class="visually-hidden">Loading…</span>
  `,
  styles: [
    `
      .sk { display: flex; flex-direction: column; gap: 0.75rem; }
      .sk__card {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: 1rem;
        display: flex; flex-direction: column; gap: 0.6rem;
      }
      .sk__line {
        height: 12px;
        border-radius: 6px;
        background: linear-gradient(90deg, #eee 25%, #f5f5f5 37%, #eee 63%);
        background-size: 400% 100%;
        animation: sk 1.4s ease infinite;
      }
      .sk__line--title { width: 45%; height: 16px; }
      .sk__line--short { width: 30%; }
      @keyframes sk { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
    `,
  ],
})
export class LoadingSkeleton {
  readonly count = input(3);
  rows(): number[] {
    return Array.from({ length: this.count() });
  }
}
