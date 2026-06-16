import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { NotesApi } from '../../../core/services/notes';
import { CategoriesApi } from '../../../core/services/categories';
import { ExportApi } from '../../../core/services/export';
import { NotesFilterState } from '../../../core/services/notes-filter-state';
import { ToastService } from '../../../core/services/toast';
import { CATEGORIES, CONTENT_TYPES, CategoryEntry, ContentType, Note, SUBCATEGORIES } from '../../../core/models/note.model';
import { NoteRow } from '../../../shared/note-row/note-row';
import { SkeletonList } from '../../../shared/skeleton-list/skeleton-list';
import { PullToRefresh } from '../../../shared/pull-to-refresh/pull-to-refresh';
import { NoteActionSheet } from '../../../shared/note-action-sheet/note-action-sheet';
import { shareNote } from '../../../shared/share-note';

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
  private categoriesApi = inject(CategoriesApi);
  private exportApi = inject(ExportApi);
  private router = inject(Router);
  private bottomSheet = inject(MatBottomSheet);
  private toast = inject(ToastService);
  protected readonly filterState = inject(NotesFilterState);

  protected readonly contentTypes: (ContentType | '')[] = ['', ...CONTENT_TYPES];
  protected readonly loadedCategories = signal<CategoryEntry[]>(
    CATEGORIES.map((name) => ({ name, subcategories: [...(SUBCATEGORIES[name] as string[])] }))
  );
  protected readonly loadedCategoryNames = computed(() => this.loadedCategories().map((c) => c.name));
  protected readonly subcategoryOptions = computed(() => {
    const cat = this.filterState.category();
    if (!cat) return [];
    return this.loadedCategories().find((c) => c.name === cat)?.subcategories ?? [];
  });
  protected readonly notes = signal<Note[]>([]);
  protected readonly loading = signal(false);

  private tagDebounceTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.categoriesApi.list().subscribe({
      next: (res) => this.loadedCategories.set(res.categories),
      error: () => {},
    });
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
        category: this.filterState.category() || undefined,
        subcategory: this.filterState.subcategory() || undefined,
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

  selectCategory(cat: string): void {
    this.filterState.category.set(cat);
    this.filterState.subcategory.set('');
    this.load();
  }

  selectSubcategory(sub: string): void {
    this.filterState.subcategory.set(sub);
    this.load();
  }

  onTagInput(value: string): void {
    this.filterState.tag.set(value);
    clearTimeout(this.tagDebounceTimer);
    this.tagDebounceTimer = setTimeout(() => this.load(), TAG_FILTER_DEBOUNCE_MS);
  }

  hasActiveFilters(): boolean {
    return (
      !!this.filterState.contentType() ||
      !!this.filterState.tag().trim() ||
      !!this.filterState.category() ||
      !!this.filterState.subcategory()
    );
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
          case 'download':
            this.downloadNoteAsMd(note);
            break;
          case 'email':
            this.emailNote(note);
            break;
        }
      });
  }

  private downloadNoteAsMd(note: Note): void {
    const blob = new Blob([`# ${note.title}\n\n${note.content}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/[/\\?%*:|"<>]/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private emailNote(note: Note): void {
    const to = window.prompt('Send to email address:');
    if (to === null) return;
    const text = `# ${note.title}\n\n${note.content}`;
    this.exportApi.emailText(note.title, text, to || undefined).subscribe({
      next: () => this.toast.success('Note emailed'),
      error: (err) => this.toast.error(err?.error?.error || 'Failed to send email. Check SMTP configuration.'),
    });
  }
}
