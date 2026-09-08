import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeader } from '../../../shared/components/page-header';
import { EmptyState } from '../../../shared/components/empty-state';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, EmptyState, TranslatePipe],
  template: `
    <app-page-header [title]="'reports.title' | t" />
    <app-empty-state icon="📈" [title]="'reports.title' | t" [message]="'reports.comingSoon' | t" />
  `,
})
export class Reports {}
