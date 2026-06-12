import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MarkdownModule } from 'ngx-markdown';
import { FilesApi } from '../../../core/services/files';
import { NotesApi } from '../../../core/services/notes';
import { NoteFile, NoteWithFiles } from '../../../core/models/note.model';

export interface FilePreviewDialogData {
  file: NoteFile;
}

@Component({
  selector: 'app-file-preview-dialog',
  imports: [DatePipe, MatDialogModule, MatButtonModule, MarkdownModule],
  templateUrl: './file-preview-dialog.html',
  styleUrl: './file-preview-dialog.scss',
})
export class FilePreviewDialog implements OnInit {
  private filesApi = inject(FilesApi);
  private notesApi = inject(NotesApi);
  private sanitizer = inject(DomSanitizer);
  private dialogRef = inject(MatDialogRef<FilePreviewDialog>);
  private router = inject(Router);
  protected readonly data = inject<FilePreviewDialogData>(MAT_DIALOG_DATA);

  protected readonly loading = signal(true);
  protected readonly previewUrl = signal<SafeResourceUrl | null>(null);
  protected readonly note = signal<NoteWithFiles | null>(null);

  protected get file(): NoteFile {
    return this.data.file;
  }

  protected get isImage(): boolean {
    return !!this.file.mime_type?.startsWith('image/');
  }

  protected get isPdf(): boolean {
    return this.file.mime_type === 'application/pdf';
  }

  ngOnInit(): void {
    if (this.isImage || this.isPdf) {
      this.filesApi.getDownloadUrl(this.file.id).subscribe({
        next: (res) => {
          this.previewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(res.url));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else if (this.file.note_id) {
      this.notesApi.get(this.file.note_id).subscribe({
        next: (note) => {
          this.note.set(note);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else {
      this.loading.set(false);
    }
  }

  openFull(): void {
    if (!this.file.note_id) return;
    this.dialogRef.close();
    this.router.navigate(['/notes', this.file.note_id]);
  }

  close(): void {
    this.dialogRef.close();
  }
}
