import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { ContactStats } from '../../core/models/contact.model';

/**
 * Reusable card for a Manufacturer (Jobber's view) or a Jobber
 * (Manufacturer's view), with an optional job-card breakdown.
 */
@Component({
  selector: 'app-contact-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    <div class="cc" [class.cc--tappable]="tappable()">
      <div class="cc__avatar" aria-hidden="true">{{ initials() }}</div>
      <div class="cc__body">
        <div class="cc__name">{{ name() }}</div>
        @if (stats(); as s) {
          <div class="cc__stats">
            <span>{{ s.total | number }} Job Cards</span>
            @if (s.inProgress) {
              <span class="dot">•</span><span>{{ s.inProgress }} in progress</span>
            }
            @if (s.completed) {
              <span class="dot">•</span><span>{{ s.completed }} completed</span>
            }
          </div>
        } @else if (subtitle()) {
          <div class="cc__stats">{{ subtitle() }}</div>
        }
      </div>
      @if (tappable()) {
        <span class="cc__chev" aria-hidden="true">›</span>
      }
    </div>
  `,
  styles: [
    `
      .cc {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        padding: 0.9rem 1rem;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        min-height: var(--tap-target);
      }
      .cc--tappable { cursor: pointer; }
      .cc--tappable:active { background: var(--color-surface-alt); }
      .cc__avatar {
        width: 42px; height: 42px; flex: 0 0 42px;
        border-radius: 50%;
        background: var(--color-primary-soft);
        color: var(--color-primary-strong);
        display: grid; place-items: center;
        font-weight: 800; font-size: 0.9rem;
      }
      .cc__body { min-width: 0; flex: 1; }
      .cc__name { font-weight: 700; font-size: 0.95rem; }
      .cc__stats {
        font-size: 0.8rem; color: var(--color-text-secondary);
        display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.15rem;
      }
      .dot { opacity: 0.5; }
      .cc__chev { font-size: 1.5rem; color: var(--color-text-faint); }
    `,
  ],
})
export class ContactCard {
  readonly name = input.required<string>();
  readonly stats = input<ContactStats | null>(null);
  readonly subtitle = input<string | null>(null);
  readonly tappable = input(false);

  initials(): string {
    return this.name()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  }
}
