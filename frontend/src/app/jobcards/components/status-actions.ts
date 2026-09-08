import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { JobcardService } from '../jobcard.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { JobCard, StatusAction } from '../../core/models/jobcard.model';
import type { AppError } from '../../core/models/api.model';

interface ActionButton {
  action: StatusAction;
  labelKey: string;
  primary?: boolean;
  danger?: boolean;
  confirm?: boolean;
}

/**
 * Renders ONLY the status buttons valid for the card's current state — the same
 * rules the backend enforces (it rejects anything else). Jobber-only; a
 * Manufacturer sees nothing here.
 */
@Component({
  selector: 'app-status-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    @if (canAct() && buttons().length) {
      <div class="sa">
        @for (b of buttons(); track b.action) {
          <button
            type="button"
            class="btn"
            [class.btn--primary]="b.primary"
            [class.btn--danger]="b.danger"
            [class.btn--outline]="!b.primary && !b.danger"
            [disabled]="busy()"
            (click)="run(b)"
          >
            {{ b.labelKey | t }}
          </button>
        }
      </div>
    }
  `,
  styles: [
    `
      .sa { display: flex; flex-wrap: wrap; gap: 0.5rem; }
      .sa .btn { flex: 1; min-width: 9rem; }
    `,
  ],
})
export class StatusActions {
  private readonly service = inject(JobcardService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly jobCard = input.required<JobCard>();
  readonly changed = output<JobCard>();

  readonly busy = signal(false);
  readonly canAct = computed(() => this.auth.hasRole('JOBBER'));

  readonly buttons = computed<ActionButton[]>(() => {
    const jc = this.jobCard();
    const list: ActionButton[] = [];

    switch (jc.workStatus) {
      case 'DRAFT':
        list.push({ action: 'ready', labelKey: 'status.markReady' });
        list.push({ action: 'start', labelKey: 'status.startWork', primary: true });
        list.push({ action: 'cancel', labelKey: 'status.cancel', danger: true, confirm: true });
        break;
      case 'READY':
        list.push({ action: 'start', labelKey: 'status.startWork', primary: true });
        list.push({ action: 'cancel', labelKey: 'status.cancel', danger: true, confirm: true });
        break;
      case 'IN_PROGRESS':
        list.push({ action: 'complete', labelKey: 'status.markCompleted', primary: true });
        list.push({ action: 'cancel', labelKey: 'status.cancel', danger: true, confirm: true });
        break;
      case 'COMPLETED':
        if (jc.dispatchStatus === 'IN_FACTORY') {
          list.push({ action: 'dispatch', labelKey: 'status.dispatch', primary: true });
        } else {
          list.push({ action: 'bring-back', labelKey: 'status.bringBack' });
        }
        break;
      default:
        break;
    }
    return list;
  });

  async run(button: ActionButton): Promise<void> {
    if (this.busy()) return;
    if (button.confirm) {
      const ok = await this.confirm.ask({
        title: 'Cancel this Job Card?',
        message: 'This cannot be undone.',
        confirmLabel: 'Yes, cancel',
        tone: 'danger',
      });
      if (!ok) return;
    }

    this.busy.set(true);
    this.service.runAction(this.jobCard().id, button.action).subscribe({
      next: ({ jobCard }) => {
        this.busy.set(false);
        this.notify.success('Status updated');
        this.changed.emit(jobCard);
      },
      error: (e: AppError) => {
        this.busy.set(false);
        this.notify.error(e.message);
      },
    });
  }
}
