import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { NotesApi } from '../../../core/services/notes';
import { CONTENT_TYPES, ContentType, Note } from '../../../core/models/note.model';

@Component({
  selector: 'app-notes-list',
  imports: [
    FormsModule,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
  ],
  templateUrl: './notes-list.html',
  styleUrl: './notes-list.scss',
})
export class NotesList implements OnInit {
  private notesApi = inject(NotesApi);
  private router = inject(Router);

  protected readonly contentTypes = CONTENT_TYPES;
  protected readonly notes = signal<Note[]>([]);
  protected readonly loading = signal(false);
  protected readonly selectedType = signal<ContentType | ''>('');
  protected readonly tagFilter = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.notesApi
      .list({
        contentType: this.selectedType() || undefined,
        tag: this.tagFilter().trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.notes.set(res.notes);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  newNote(): void {
    this.router.navigate(['/notes/new']);
  }

  openNote(id: string): void {
    this.router.navigate(['/notes', id]);
  }

  deleteNote(event: Event, id: string): void {
    event.stopPropagation();
    if (!confirm('Delete this note? This cannot be undone.')) return;
    this.notesApi.delete(id).subscribe(() => this.load());
  }

  contentSnippet(content: string): string {
    return content.length > 160 ? `${content.slice(0, 160)}…` : content;
  }
}
