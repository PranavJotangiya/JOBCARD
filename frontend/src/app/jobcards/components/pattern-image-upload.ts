import { ChangeDetectionStrategy, Component, inject, input, model, signal } from '@angular/core';
import { JobcardService } from '../jobcard.service';
import { NotificationService } from '../../core/services/notification.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { AppError } from '../../core/models/api.model';

/**
 * Mobile-friendly pattern (farma) image capture.
 *   - "Take Photo"  -> camera (`capture="environment"`)
 *   - "Choose Photo" / "Choose File" -> gallery / files
 * Uploads immediately to the files service; keeps only the returned file id.
 * Shows a preview with replace / remove. Upload failure keeps the form intact.
 */
@Component({
  selector: 'app-pattern-image-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <div class="piu">
      @if (previewUrl()) {
        <div class="piu__preview">
          <img [src]="previewUrl()" alt="Pattern image preview" />
          <div class="piu__preview-actions">
            <button type="button" class="btn btn--sm btn--outline" [disabled]="disabled() || uploading()" (click)="camera.click()">
              {{ 'jobcard.replaceImage' | t }}
            </button>
            <button type="button" class="btn btn--sm btn--danger" [disabled]="disabled() || uploading()" (click)="remove()">
              {{ 'jobcard.removeImage' | t }}
            </button>
          </div>
        </div>
      } @else {
        <div class="piu__buttons">
          <button type="button" class="btn btn--outline" [disabled]="disabled() || uploading()" (click)="camera.click()">
            📷 {{ 'jobcard.takePhoto' | t }}
          </button>
          <button type="button" class="btn btn--outline" [disabled]="disabled() || uploading()" (click)="gallery.click()">
            🖼️ {{ 'jobcard.choosePhoto' | t }}
          </button>
        </div>
      }

      @if (uploading()) {
        <p class="piu__status" role="status">{{ 'action.loading' | t }}</p>
      }

      <input #camera type="file" accept="image/*" capture="environment" hidden (change)="onPick($event)" />
      <input #gallery type="file" accept="image/*" hidden (change)="onPick($event)" />
    </div>
  `,
  styles: [
    `
      .piu__buttons { display: flex; gap: 0.5rem; flex-wrap: wrap; }
      .piu__buttons .btn { flex: 1; min-width: 8rem; }
      .piu__preview { display: flex; flex-direction: column; gap: 0.5rem; }
      .piu__preview img {
        width: 100%; max-height: 240px; object-fit: contain;
        border: 1px solid var(--color-border); border-radius: var(--radius-sm);
        background: var(--color-surface-alt);
      }
      .piu__preview-actions { display: flex; gap: 0.5rem; }
      .piu__preview-actions .btn { flex: 1; }
      .piu__status { font-size: 0.82rem; color: var(--color-text-secondary); margin: 0.5rem 0 0; }
    `,
  ],
})
export class PatternImageUpload {
  private readonly service = inject(JobcardService);
  private readonly notify = inject(NotificationService);

  /** two-way: the uploaded FileAsset id (or null) */
  readonly fileId = model<string | null>(null);
  /** optional existing URL to seed the preview (edit mode) */
  readonly existingUrl = input<string | null>(null);
  readonly disabled = input(false);

  readonly uploading = signal(false);
  private readonly localPreview = signal<string | null>(null);

  previewUrl(): string | null {
    if (this.localPreview()) return this.localPreview();
    if (this.fileId()) return this.service.fileRawUrl(this.fileId()!);
    return this.existingUrl();
  }

  onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.localPreview.set(URL.createObjectURL(file));
    this.uploading.set(true);
    this.service.uploadPatternImage(file).subscribe({
      next: ({ file: uploaded }) => {
        this.uploading.set(false);
        this.fileId.set(uploaded.id);
      },
      error: (e: AppError) => {
        this.uploading.set(false);
        this.localPreview.set(null);
        this.notify.error(e.message);
      },
    });
  }

  remove(): void {
    this.localPreview.set(null);
    this.fileId.set(null);
  }
}
