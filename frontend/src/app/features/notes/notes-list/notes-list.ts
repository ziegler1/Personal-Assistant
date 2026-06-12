import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { NotesApi } from '../../../core/services/notes';
import { NotesFilterState } from '../../../core/services/notes-filter-state';
import { CONTENT_TYPES, ContentType, Note } from '../../../core/models/note.model';
import { NoteRow } from '../../../shared/note-row/note-row';
import { SkeletonList } from '../../../shared/skeleton-list/skeleton-list';
import { PullToRefresh } from '../../../shared/pull-to-refresh/pull-to-refresh';
import { NoteActionSheet } from '../../../shared/note-action-sheet/note-action-sheet';
import { shareNote } from '../../../shared/share-note';
import { ToastService } from '../../../core/services/toast';

const TAG_FILTER_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-notes-list',
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    NoteRow,
    SkeletonList,
    PullToRefresh,
  ],
  templateUrl: './notes-list.html',
  styleUrl: './notes-list.scss',
})
export class NotesList implements OnInit, OnDestroy {
  private notesApi = inject(NotesApi);
  private router = inject(Router);
  private bottomSheet = inject(MatBottomSheet);
  private toast = inject(ToastService);
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
    this.notesApi.delete(id).subscribe({
      next: () => {
        this.load();
        this.toast.success('Note deleted');
      },
      error: () => this.toast.error('Failed to delete note'),
    });
  }

  openActionSheet(note: Note): void {
    this.bottomSheet
      .open(NoteActionSheet, { data: { title: note.title } })
      .afterDismissed()
      .subscribe((action) => {
        switch (action) {
          case 'edit':
            this.router.navigate(['/notes', note.id], { queryParams: { edit: 1 } });
            break;
          case 'delete':
            this.deleteNote(note.id);
            break;
          case 'share':
            shareNote(note, this.toast);
            break;
        }
      });
  }
}
