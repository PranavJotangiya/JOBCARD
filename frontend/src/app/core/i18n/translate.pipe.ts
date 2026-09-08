import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from './translation.service';

/**
 * `{{ 'jobcard.new' | t }}`  or  `{{ 'dash.greeting' | t:{ name: user.name } }}`
 *
 * Impure so it re-evaluates when the language signal changes (the signal read in
 * `translate()` also makes any component using it reactive).
 */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(TranslationService);

  transform(key: string, params?: Record<string, string | number>): string {
    // touch the signal so this pipe recomputes on language change
    this.i18n.lang();
    return this.i18n.translate(key, params);
  }
}
