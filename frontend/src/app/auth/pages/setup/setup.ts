import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import type { AppError } from '../../../core/models/api.model';

/** One-time first-Admin setup. The route guard only allows this while no admin exists. */
@Component({
  selector: 'app-setup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslatePipe],
  template: `
    <h1 class="setup__title">{{ 'setup.title' | t }}</h1>
    <p class="setup__sub">{{ 'setup.subtitle' | t }}</p>

    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="field">
        <label for="name">{{ 'setup.name' | t }}</label>
        <input id="name" class="input" formControlName="name" autocomplete="name" />
      </div>
      <div class="field">
        <label for="username">{{ 'auth.username' | t }}</label>
        <input
          id="username"
          class="input"
          formControlName="username"
          autocapitalize="none"
          spellcheck="false"
          autocomplete="username"
        />
        <span class="field__hint">Letters, digits, dot, underscore, hyphen. Min 3.</span>
      </div>
      <div class="field">
        <label for="password">{{ 'auth.password' | t }}</label>
        <input
          id="password"
          type="password"
          class="input"
          formControlName="password"
          autocomplete="new-password"
        />
        <span class="field__hint">Min 8, with upper &amp; lower case and a number.</span>
      </div>

      @if (errorMsg()) {
        <p class="field__error" role="alert">{{ errorMsg() }}</p>
      }

      <button type="submit" class="btn btn--primary btn--block btn--lg" [disabled]="submitting()">
        {{ submitting() ? ('action.saving' | t) : ('setup.create' | t) }}
      </button>
    </form>
  `,
  styles: [
    `
      .setup__title { font-size: 1.2rem; text-align: center; margin-bottom: 0.3rem; }
      .setup__sub {
        text-align: center;
        color: var(--color-text-secondary);
        font-size: 0.85rem;
        margin-bottom: 1.1rem;
      }
    `,
  ],
})
export class Setup {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly submitting = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    username: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-z0-9._-]+$/i)]],
    password: [
      '',
      [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)],
    ],
  });

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMsg.set(null);

    this.auth
      .completeSetup(this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => void this.router.navigateByUrl('/'),
        error: (err: AppError) => {
          this.submitting.set(false);
          this.errorMsg.set(err.message);
        },
      });
  }
}
