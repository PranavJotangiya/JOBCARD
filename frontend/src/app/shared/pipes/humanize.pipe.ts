import { Pipe, PipeTransform } from '@angular/core';

/** `WORK_STARTED` / `in_progress` -> "Work Started" / "In Progress". */
@Pipe({ name: 'humanize' })
export class HumanizePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    return value
      .replace(/[_-]+/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
