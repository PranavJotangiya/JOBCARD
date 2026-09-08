import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { LoadingService } from '../core/services/loading.service';
import { ConfirmDialogService } from '../shared/components/confirm-dialog.service';
import { ConfirmDialog } from '../shared/components/confirm-dialog';
import { Toasts } from '../shared/components/toasts';
import { BottomSheet } from '../shared/components/bottom-sheet';
import { TranslatePipe } from '../core/i18n/translate.pipe';

interface NavItem {
  path: string;
  labelKey: string;
  icon: string;
}

/**
 * Authenticated app chrome.
 *
 * Mobile-first: a compact top header + a max-4-item bottom navigation, with
 * secondary destinations in a "More" bottom sheet. From 1024px the bottom nav is
 * replaced by a left sidebar. Content is a routed outlet with generous bottom
 * padding so the fixed bottom nav / sticky action bars never cover it.
 */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ConfirmDialog,
    Toasts,
    BottomSheet,
    TranslatePipe,
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmDialogService);
  readonly loading = inject(LoadingService);

  readonly user = this.auth.user;
  readonly moreOpen = signal(false);

  private readonly ITEMS: Record<'JOBBER' | 'MANUFACTURER' | 'ADMIN', NavItem[]> = {
    JOBBER: [
      { path: '/', labelKey: 'nav.home', icon: '🏠' },
      { path: '/jobcards', labelKey: 'nav.jobCards', icon: '🗂️' },
      { path: '/manufacturers', labelKey: 'nav.manufacturers', icon: '🏭' },
    ],
    MANUFACTURER: [
      { path: '/', labelKey: 'nav.home', icon: '🏠' },
      { path: '/jobcards', labelKey: 'nav.jobCards', icon: '🗂️' },
      { path: '/jobbers', labelKey: 'nav.jobbers', icon: '👷' },
    ],
    ADMIN: [
      { path: '/', labelKey: 'nav.home', icon: '🏠' },
      { path: '/jobcards', labelKey: 'nav.jobCards', icon: '🗂️' },
    ],
  };

  readonly primaryNav = computed<NavItem[]>(() => {
    const role = this.user()?.role;
    return role ? this.ITEMS[role] : [];
  });

  readonly moreNav: NavItem[] = [
    { path: '/reports', labelKey: 'nav.reports', icon: '📈' },
    { path: '/settings', labelKey: 'nav.settings', icon: '⚙️' },
  ];

  openMore(): void {
    this.moreOpen.set(true);
  }
  closeMore(): void {
    this.moreOpen.set(false);
  }

  goAndClose(path: string): void {
    this.closeMore();
    void this.router.navigateByUrl(path);
  }

  async logout(): Promise<void> {
    this.closeMore();
    const ok = await this.confirm.ask({
      title: 'Sign out?',
      message: 'You will need to sign in again to use JOBCARD.',
      confirmLabel: 'Sign out',
    });
    if (!ok) return;
    await this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
