import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';

/** Large (48px+) debounced search input. Emits the trimmed term after typing stops. */
@Component({
  selector: 'app-search-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <div class="sb">
      <span class="sb__icon" aria-hidden="true">🔍</span>
      <input
        #box
        type="search"
        class="sb__input"
        [formControl]="control"
        [placeholder]="placeholder()"
        [attr.aria-label]="placeholder()"
        autocomplete="off"
        enterkeyhint="search"
      />
      @if (control.value) {
        <button type="button" class="sb__clear" aria-label="Clear search" (click)="clear()">✕</button>
      }
    </div>
  `,
  styles: [
    `
      .sb { position: relative; display: flex; align-items: center; }
      .sb__icon { position: absolute; left: 0.9rem; font-size: 0.95rem; opacity: 0.6; pointer-events: none; }
      .sb__input {
        width: 100%;
        min-height: var(--tap-target);
        padding: 0.7rem 2.5rem;
        border: 1.5px solid var(--color-border-strong);
        border-radius: var(--radius-pill);
        background: var(--color-surface);
        color: var(--color-text);
        font: inherit;
        font-size: 16px;
      }
      .sb__input:focus { outline: none; border-color: var(--color-primary); }
      .sb__clear {
        position: absolute; right: 0.5rem;
        width: 36px; height: 36px;
        border: 0; border-radius: 50%;
        background: var(--color-surface-alt);
        color: var(--color-text-secondary);
        cursor: pointer;
      }
    `,
  ],
})
export class SearchBar {
  private readonly destroyRef = inject(DestroyRef);
  readonly placeholder = input('Search…');
  readonly value = input('');
  readonly search = output<string>();

  readonly control = new FormControl('', { nonNullable: true });

  constructor() {
    effect(() => {
      const v = this.value();
      if (v !== this.control.value) this.control.setValue(v, { emitEvent: false });
    });
    this.control.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.search.emit(v.trim()));
  }

  clear(): void {
    this.control.setValue('');
  }
}
