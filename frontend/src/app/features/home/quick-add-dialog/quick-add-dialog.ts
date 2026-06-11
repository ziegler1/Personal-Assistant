import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { NotesApi } from '../../../core/services/notes';
import { CONTENT_TYPES, ContentType, Note } from '../../../core/models/note.model';

@Component({
  selector: 'app-quick-add-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
  ],
  templateUrl: './quick-add-dialog.html',
  styleUrl: './quick-add-dialog.scss',
})
export class QuickAddDialog {
  private notesApi = inject(NotesApi);
  private dialogRef = inject(MatDialogRef<QuickAddDialog, Note | undefined>);

  protected readonly contentTypes = CONTENT_TYPES;
  protected readonly title = signal('');
  protected readonly content = signal('');
  protected readonly contentType = signal<ContentType>('text');
  protected readonly tags = signal<string[]>([]);
  protected readonly tagInput = signal('');
  protected readonly saving = signal(false);

  addTag(): void {
    const value = this.tagInput().trim();
    if (value && !this.tags().includes(value)) {
      this.tags.set([...this.tags(), value]);
    }
    this.tagInput.set('');
  }

  removeTag(tag: string): void {
    this.tags.set(this.tags().filter((t) => t !== tag));
  }

  save(): void {
    if (!this.title().trim() || this.saving()) return;

    this.saving.set(true);
    this.notesApi
      .create({
        title: this.title().trim(),
        content: this.content(),
        content_type: this.contentType(),
        source: null,
        tags: this.tags(),
      })
      .subscribe({
        next: (note) => {
          this.saving.set(false);
          this.dialogRef.close(note);
        },
        error: () => this.saving.set(false),
      });
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}
