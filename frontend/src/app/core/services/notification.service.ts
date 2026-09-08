import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  title?: string;
}

/**
 * App-wide, non-blocking feedback. Backed by a signal so <app-toasts> renders
 * reactively. The error interceptor calls `error()` for unhandled API failures;
 * components call `success()` after mutations.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();
  private nextId = 1;

  private push(kind: ToastKind, message: string, title?: string): void {
    const id = this.nextId++;
    this._toasts.update((list) => [...list, { id, kind, message, title }]);
    const ttl = kind === 'error' ? 7000 : environment.toastTimeoutMs;
    setTimeout(() => this.dismiss(id), ttl);
  }

  success(message: string, title?: string): void {
    this.push('success', message, title);
  }
  error(message: string, title = 'Something went wrong'): void {
    this.push('error', message, title);
  }
  info(message: string, title?: string): void {
    this.push('info', message, title);
  }
  warning(message: string, title?: string): void {
    this.push('warning', message, title);
  }

  dismiss(id: number): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
