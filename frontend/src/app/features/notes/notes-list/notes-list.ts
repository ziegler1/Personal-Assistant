import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NotesApi } from '../../../core/services/notes';
import { NotesFilterState } from '../../../core/services/notes-filter-state';
import { CONTENT_TYPES, ContentType, Note } from '../../../core/models/note.model';
import { NoteRow } from '../../../shared/note-row/note-row';

const TAG_FILTER_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-notes-list',
  imports: [FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, NoteRow],
  templateUrl: './notes-list.html',
  styleUrl: './notes-list.scss',
})
export class NotesList implements OnInit, OnDestroy {
  private notesApi = inject(NotesApi);
  private router = inject(Router);
  protected readonly filterState = inject(NotesFilterState);

  protected readonly contentTypes: (ContentType | '')[] = ['', ...CONTENT_TYPES];
  protected readonly notes = signal<Note[]>([]);
  protected readonly loading = signal(false);

  private tagDebounceTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    clearTimeout(this.tagDebounceTimer);
  }

  load(): void {
    this.loading.set(true);
    this.notesApi
      .list({
        contentType: this.filterState.contentType() || undefined,
        tag: this.filterState.tag().trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.notes.set(res.notes);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  selectType(type: ContentType | ''): void {
    this.filterState.contentType.set(type);
    this.load();
  }

  onTagInput(value: string): void {
    this.filterState.tag.set(value);
    clearTimeout(this.tagDebounceTimer);
    this.tagDebounceTimer = setTimeout(() => this.load(), TAG_FILTER_DEBOUNCE_MS);
  }

  hasActiveFilters(): boolean {
    return !!this.filterState.contentType() || !!this.filterState.tag().trim();
  }

  newNote(): void {
    this.router.navigate(['/notes/new']);
  }

  openNote(id: string): void {
    this.router.navigate(['/notes', id]);
  }

  deleteNote(id: string): void {
    if (!confirm('Delete this note? This cannot be undone.')) return;
    this.notesApi.delete(id).subscribe(() => this.load());
  }
}
