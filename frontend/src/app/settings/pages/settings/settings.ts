import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog.service';
import { PageHeader } from '../../../shared/components/page-header';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LANGS, TranslationService, type Lang } from '../../../core/i18n/translation.service';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, TranslatePipe],
  template: `
    <app-page-header [title]="'settings.title' | t" />

    <section class="card set__block">
      <h2>{{ 'settings.language' | t }}</h2>
      <div class="set__langs">
        @for (l of langs; track l.code) {
          <button
            type="button"
            class="btn"
            [class.btn--primary]="i18n.lang() === l.code"
            [class.btn--outline]="i18n.lang() !== l.code"
            (click)="i18n.setLang(l.code)"
          >
            {{ l.labelKey | t }}
          </button>
        }
      </div>
    </section>

    @if (auth.user(); as u) {
      <section class="card set__block">
        <h2>{{ 'settings.account' | t }}</h2>
        <dl class="set__kv">
          <div><dt>Name</dt><dd>{{ u.name }}</dd></div>
          <div><dt>Username</dt><dd>{{ u.username }}</dd></div>
          <div><dt>Role</dt><dd>{{ u.role }}</dd></div>
          @if (u.manufacturerName) {
            <div><dt>Manufacturer</dt><dd>{{ u.manufacturerName }}</dd></div>
          }
          @if (u.jobberName) {
            <div><dt>Jobber</dt><dd>{{ u.jobberName }}</dd></div>
          }
        </dl>
        <button type="button" class="btn btn--danger btn--block" (click)="logout()">
          {{ 'nav.logout' | t }}
        </button>
      </section>
    }
  `,
  styles: [
    `
      .set__block { margin-bottom: 1rem; }
      .set__block h2 { font-size: 1rem; margin: 0 0 0.75rem; }
      .set__langs { display: flex; gap: 0.5rem; flex-wrap: wrap; }
      .set__langs .btn { flex: 1; min-width: 6rem; }
      .set__kv { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin: 0 0 1rem; }
      .set__kv dt { font-size: 0.7rem; text-transform: uppercase; color: var(--color-text-secondary); }
      .set__kv dd { margin: 0; font-weight: 600; }
    `,
  ],
})
export class Settings {
  readonly i18n = inject(TranslationService);
  readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly router = inject(Router);
  readonly langs = LANGS;

  setLang(l: Lang): void {
    this.i18n.setLang(l);
  }

  async logout(): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Sign out?',
      message: 'You will need to sign in again.',
      confirmLabel: 'Sign out',
    });
    if (!ok) return;
    await this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
