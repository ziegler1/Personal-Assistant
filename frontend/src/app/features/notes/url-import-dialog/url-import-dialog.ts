import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { NotesApi } from '../../../core/services/notes';
import { Note } from '../../../core/models/note.model';

@Component({
  selector: 'app-url-import-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  templateUrl: './url-import-dialog.html',
  styleUrl: './url-import-dialog.scss',
})
export class UrlImportDialog {
  private notesApi = inject(NotesApi);
  private dialogRef = inject(MatDialogRef<UrlImportDialog, Note | undefined>);

  protected readonly url = signal('');
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  import(): void {
    const urlValue = this.url().trim();
    if (!urlValue || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    this.notesApi.fromUrl(urlValue).subscribe({
      next: (note) => {
        this.loading.set(false);
        this.dialogRef.close(note);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error || 'Failed to import URL — please try again');
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}
