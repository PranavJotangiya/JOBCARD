import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';

/**
 * Mobile-first modal: slides up from the bottom on phones, becomes a centred
 * card on wide screens. Content + a title are projected. Emits `close`.
 *
 * The backdrop is a real `<button>` (keyboard-operable, focusable) sitting
 * behind the panel — an accessible click-outside-to-close without trapping
 * pointer events on a non-interactive div.
 */
@Component({
  selector: 'app-bottom-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="bs">
        <button type="button" class="bs__scrim" aria-label="Close" (click)="close.emit()"></button>
        <div class="bs__panel" role="dialog" aria-modal="true" [attr.aria-label]="title()">
          <div class="bs__grip" aria-hidden="true"></div>
          <div class="bs__head">
            <h2 class="bs__title">{{ title() }}</h2>
            <button type="button" class="bs__x" aria-label="Close" (click)="close.emit()">✕</button>
          </div>
          <div class="bs__body"><ng-content /></div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .bs {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        animation: fade 0.15s ease;
      }
      .bs__scrim {
        position: absolute;
        inset: 0;
        border: 0;
        padding: 0;
        background: rgba(15, 23, 42, 0.45);
        cursor: pointer;
      }
      .bs__panel {
        position: relative;
        width: 100%;
        max-width: 520px;
        background: var(--color-surface);
        border-radius: var(--radius-xl) var(--radius-xl) 0 0;
        padding: 0.5rem 1.15rem calc(1.15rem + var(--safe-bottom));
        max-height: 90vh;
        overflow-y: auto;
        animation: slide-up 0.2s ease;
      }
      .bs__grip {
        width: 40px; height: 4px; border-radius: 2px;
        background: var(--color-border-strong);
        margin: 0.35rem auto 0.5rem;
      }
      .bs__head { display: flex; align-items: center; justify-content: space-between; }
      .bs__title { margin: 0; font-size: 1.1rem; }
      .bs__x {
        width: 40px; height: 40px; border: 0; border-radius: 50%;
        background: var(--color-surface-alt); color: var(--color-text-secondary); cursor: pointer;
      }
      .bs__body { padding-top: 0.5rem; }
      @keyframes slide-up { from { transform: translateY(100%); } }
      @keyframes fade { from { opacity: 0; } }
      @media (min-width: 640px) {
        .bs { align-items: center; }
        .bs__panel { border-radius: var(--radius-xl); max-height: 85vh; }
      }
    `,
  ],
})
export class BottomSheet {
  readonly open = input(false);
  readonly title = input('');
  readonly close = output<void>();

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.open()) this.close.emit();
  }
}
