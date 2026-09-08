import { Injectable, computed, signal } from '@angular/core';

/**
 * Global request-in-flight indicator. A counter (not a boolean) keeps it correct
 * when several requests overlap. <app-shell> shows a thin top progress bar while
 * `isLoading()` is true.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly pending = signal(0);
  readonly isLoading = computed(() => this.pending() > 0);

  start(): void {
    this.pending.update((n) => n + 1);
  }

  stop(): void {
    this.pending.update((n) => Math.max(0, n - 1));
  }
}
