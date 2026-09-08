import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}

interface ConfirmState extends Required<ConfirmOptions> {
  resolve: (ok: boolean) => void;
}

/**
 * Promise-based confirmation, decoupled from any component:
 *   if (await confirm.ask({ title:'Delete?', message:'…', tone:'danger' })) { … }
 * <app-confirm-dialog> (mounted once in the shell) renders the active state.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly _state = signal<ConfirmState | null>(null);
  readonly state = this._state.asReadonly();

  ask(options: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this._state.set({
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'Confirm',
        cancelLabel: options.cancelLabel ?? 'Cancel',
        tone: options.tone ?? 'default',
        resolve,
      });
    });
  }

  respond(ok: boolean): void {
    const s = this._state();
    if (!s) return;
    s.resolve(ok);
    this._state.set(null);
  }
}
