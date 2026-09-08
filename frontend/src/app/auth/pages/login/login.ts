import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { environment } from '../../../../environments/environment';
import type { AppError } from '../../../core/models/api.model';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly submitting = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly sessionExpired = this.route.snapshot.queryParamMap.get('reason') === 'expired';
  readonly showDemo = !environment.production;

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  constructor() {
    // If the instance has no admin yet, send the user to first-run setup.
    this.auth
      .isSetupRequired()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ setupRequired }) => {
          if (setupRequired) void this.router.navigate(['/setup']);
        },
        error: () => undefined,
      });
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMsg.set(null);

    this.auth
      .login(this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
          void this.router.navigateByUrl(returnUrl);
        },
        error: (err: AppError) => {
          this.submitting.set(false);
          this.errorMsg.set(err.message);
        },
      });
  }

  fillDemo(username: string): void {
    const password = { admin: 'Admin@12345', yash: 'Yash@12345', abc: 'Abc@12345' }[username] ?? '';
    this.form.setValue({ username, password });
  }
}
