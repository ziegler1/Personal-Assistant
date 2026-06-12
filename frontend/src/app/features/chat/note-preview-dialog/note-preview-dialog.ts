import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MarkdownModule } from 'ngx-markdown';
import { NotesApi } from '../../../core/services/notes';
import { NoteWithFiles } from '../../../core/models/note.model';

export interface NotePreviewDialogData {
  noteId: string;
}

@Component({
  selector: 'app-note-preview-dialog',
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatChipsModule, MarkdownModule],
  templateUrl: './note-preview-dialog.html',
  styleUrl: './note-preview-dialog.scss',
})
export class NotePreviewDialog implements OnInit {
  private notesApi = inject(NotesApi);
  private dialogRef = inject(MatDialogRef<NotePreviewDialog>);
  private router = inject(Router);
  private data = inject<NotePreviewDialogData>(MAT_DIALOG_DATA);

  protected readonly note = signal<NoteWithFiles | null>(null);
  protected readonly loading = signal(true);

  protected get sourceIsUrl(): boolean {
    const source = this.note()?.source;
    return !!source && /^https?:\/\//i.test(source);
  }

  ngOnInit(): void {
    this.notesApi.get(this.data.noteId).subscribe({
      next: (note) => {
        this.note.set(note);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openFull(): void {
    const note = this.note();
    if (!note) return;
    this.dialogRef.close();
    this.router.navigate(['/notes', note.id]);
  }

  close(): void {
    this.dialogRef.close();
  }
}
