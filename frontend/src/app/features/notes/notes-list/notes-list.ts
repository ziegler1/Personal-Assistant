import { Component, ElementRef, OnDestroy, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { UrlImportDialog } from '../url-import-dialog/url-import-dialog';
import { NotesApi } from '../../../core/services/notes';
import { CategoriesApi } from '../../../core/services/categories';
import { ExportApi } from '../../../core/services/export';
import { ShareApi } from '../../../core/services/share';
import { NotesFilterState } from '../../../core/services/notes-filter-state';
import { ToastService } from '../../../core/services/toast';
import {
  CATEGORIES,
  CATEGORY_ICONS,
  CONTENT_TYPES,
  CategoryEntry,
  ContentType,
  Note,
  SUBCATEGORIES,
  SubcategoryEntry,
} from '../../../core/models/note.model';
import { NoteRow } from '../../../shared/note-row/note-row';
import { SkeletonList } from '../../../shared/skeleton-list/skeleton-list';
import { PullToRefresh } from '../../../shared/pull-to-refresh/pull-to-refresh';
import { NoteActionSheet } from '../../../shared/note-action-sheet/note-action-sheet';
import { shareNote } from '../../../shared/share-note';

const TAG_FILTER_DEBOUNCE_MS = 300;

const FALLBACK_CATEGORIES: CategoryEntry[] = CATEGORIES.map((name) => ({
  id: '',
  name,
  icon: CATEGORY_ICONS[name] || '📁',
  subcategories: (SUBCATEGORIES[name] as string[]).map((s) => ({ id: '', name: s })),
}));

const PRESET_ICONS = [
  '👤', '🚀', '⚙️', '💼', '🔧', '📁', '📝', '🎯',
  '🧠', '💡', '🔬', '🎨', '🏠', '💰', '📊', '🔑',
  '🌐', '⭐', '🔒', '📦', '🗂️', '🧩', '🎓', '🛠️',
];

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
  private shareApi = inject(ShareApi);
  private router = inject(Router);
  private bottomSheet = inject(MatBottomSheet);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);
  protected readonly filterState = inject(NotesFilterState);

  private newBrowseCatInputRef = viewChild<ElementRef<HTMLInputElement>>('newBrowseCatInput');
  private newBrowseSubInputRef = viewChild<ElementRef<HTMLInputElement>>('newBrowseSubInput');
  private editCatNameInputRef = viewChild<ElementRef<HTMLInputElement>>('editCatNameInput');
  private editSubNameInputRef = viewChild<ElementRef<HTMLInputElement>>('editSubNameInput');

  protected readonly contentTypes: (ContentType | '')[] = ['', ...CONTENT_TYPES];
  protected readonly presetIcons = PRESET_ICONS;

  protected readonly loadedCategories = signal<CategoryEntry[]>(FALLBACK_CATEGORIES);
  protected readonly loadedCategoryNames = computed(() => this.loadedCategories().map((c) => c.name));
  protected readonly subcategoryOptions = computed((): string[] => {
    const cat = this.filterState.category();
    if (!cat) return [];
    return this.loadedCategories().find((c) => c.name === cat)?.subcategories.map((s) => s.name) ?? [];
  });

  protected readonly notes = signal<Note[]>([]);
  protected readonly loading = signal(false);

  // ── View mode ──────────────────────────────────────────────────────────
  protected readonly viewMode = signal<'list' | 'browse'>(
    (localStorage.getItem('notes-view-mode') || 'list') as 'list' | 'browse'
  );
  protected readonly browseEditMode = signal(false);
  protected readonly browseSelectedCategory = signal<string | null>(null);
  protected readonly browseSelectedCategoryEntry = computed(() => {
    const name = this.browseSelectedCategory();
    if (!name) return null;
    return this.loadedCategories().find((c) => c.name === name) ?? null;
  });

  // ── Inline edit state – category ──────────────────────────────────────
  protected readonly editingCategoryId = signal<string | null>(null);
  protected readonly editCatName = signal('');
  protected readonly editCatIcon = signal('');
  protected readonly addingBrowseCategory = signal(false);
  protected readonly newBrowseCatName = signal('');
  protected readonly newBrowseCatIcon = signal('📁');

  // ── Inline edit state – subcategory ───────────────────────────────────
  protected readonly editingSubcategoryId = signal<string | null>(null);
  protected readonly editSubName = signal('');
  protected readonly addingBrowseSub = signal(false);
  protected readonly newBrowseSubName = signal('');

  private tagDebounceTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.categoriesApi.list().subscribe({
      next: (res) => this.loadedCategories.set(res.categories),
      error: () => {},
    });
    if (this.viewMode() === 'list') {
      this.load();
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.tagDebounceTimer);
  }

  // ── List mode ──────────────────────────────────────────────────────────

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

  importFromUrl(): void {
    this.dialog
      .open(UrlImportDialog, { width: '480px' })
      .afterClosed()
      .subscribe((note) => {
        if (note) {
          this.toast.success('Article saved');
          this.router.navigate(['/notes', note.id]);
        }
      });
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
            shareNote(note, this.shareApi, this.toast);
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
    this.exportApi.emailText(note.title, `# ${note.title}\n\n${note.content}`, to || undefined).subscribe({
      next: () => this.toast.success('Note emailed'),
      error: (err) => this.toast.error(err?.error?.error || 'Failed to send email. Check SMTP configuration.'),
    });
  }

  // ── View mode toggle ───────────────────────────────────────────────────

  toggleViewMode(): void {
    const next: 'list' | 'browse' = this.viewMode() === 'list' ? 'browse' : 'list';
    this.viewMode.set(next);
    localStorage.setItem('notes-view-mode', next);
    if (next === 'browse') {
      this.browseEditMode.set(false);
      this.browseSelectedCategory.set(null);
      this.categoriesApi.list().subscribe({
        next: (res) => this.loadedCategories.set(res.categories),
        error: () => {},
      });
    } else {
      this.load();
    }
  }

  toggleBrowseEditMode(): void {
    const next = !this.browseEditMode();
    this.browseEditMode.set(next);
    if (!next) {
      this.editingCategoryId.set(null);
      this.editingSubcategoryId.set(null);
      this.addingBrowseCategory.set(false);
      this.addingBrowseSub.set(false);
    }
  }

  toggleBrowseCategory(name: string): void {
    if (this.editingCategoryId() !== null) return;
    this.browseSelectedCategory.set(this.browseSelectedCategory() === name ? null : name);
    this.editingSubcategoryId.set(null);
    this.addingBrowseSub.set(false);
    this.newBrowseSubName.set('');
  }

  selectSubcategoryFromBrowse(catName: string, subName: string): void {
    this.filterState.category.set(catName);
    this.filterState.subcategory.set(subName);
    this.viewMode.set('list');
    localStorage.setItem('notes-view-mode', 'list');
    this.load();
  }

  // ── Category management ────────────────────────────────────────────────

  startEditCategory(cat: CategoryEntry): void {
    this.editCatName.set(cat.name);
    this.editCatIcon.set(cat.icon || '📁');
    this.editingCategoryId.set(cat.id);
    setTimeout(() => this.editCatNameInputRef()?.nativeElement.focus(), 0);
  }

  saveCategoryEdit(cat: CategoryEntry): void {
    const name = this.editCatName().trim().toUpperCase();
    const icon = this.editCatIcon() || '📁';
    if (!name) {
      this.editingCategoryId.set(null);
      return;
    }
    this.categoriesApi.update(cat.id, name, icon).subscribe({
      next: (res) => {
        const oldName = cat.name;
        this.loadedCategories.update((cats) =>
          cats.map((c) => (c.id === cat.id ? { ...c, name: res.name, icon: res.icon } : c))
        );
        if (this.browseSelectedCategory() === oldName) {
          this.browseSelectedCategory.set(res.name);
        }
        this.editingCategoryId.set(null);
        this.toast.success('Category updated');
      },
      error: () => this.toast.error('Failed to update category'),
    });
  }

  deleteCategory(cat: CategoryEntry): void {
    if (
      !confirm(
        `Delete "${cat.name}"?\n\nThis will remove the category from all notes. Notes will not be deleted.`
      )
    )
      return;
    this.categoriesApi.delete(cat.id).subscribe({
      next: () => {
        this.loadedCategories.update((cats) => cats.filter((c) => c.id !== cat.id));
        if (this.browseSelectedCategory() === cat.name) {
          this.browseSelectedCategory.set(null);
        }
        this.toast.success('Category deleted');
      },
      error: () => this.toast.error('Failed to delete category'),
    });
  }

  startAddBrowseCategory(): void {
    this.newBrowseCatName.set('');
    this.newBrowseCatIcon.set('📁');
    this.addingBrowseCategory.set(true);
    setTimeout(() => this.newBrowseCatInputRef()?.nativeElement.focus(), 0);
  }

  createBrowseCategory(): void {
    const name = this.newBrowseCatName().trim().toUpperCase();
    if (!name) {
      this.addingBrowseCategory.set(false);
      return;
    }
    this.categoriesApi.create(name, this.newBrowseCatIcon()).subscribe({
      next: (res) => {
        this.loadedCategories.update((cats) => [
          ...cats,
          { id: res.id, name: res.name, icon: res.icon, note_count: 0, subcategories: [] },
        ]);
        this.addingBrowseCategory.set(false);
        this.toast.success('Category created');
      },
      error: () => this.toast.error('Failed to create category'),
    });
  }

  // ── Subcategory management ─────────────────────────────────────────────

  startEditSubcategory(sub: SubcategoryEntry): void {
    this.editSubName.set(sub.name);
    this.editingSubcategoryId.set(sub.id);
    setTimeout(() => this.editSubNameInputRef()?.nativeElement.focus(), 0);
  }

  saveSubcategoryEdit(sub: SubcategoryEntry, cat: CategoryEntry): void {
    const name = this.editSubName().trim();
    if (!name) {
      this.editingSubcategoryId.set(null);
      return;
    }
    this.categoriesApi.updateSubcategory(sub.id, name).subscribe({
      next: (res) => {
        this.loadedCategories.update((cats) =>
          cats.map((c) =>
            c.id === cat.id
              ? {
                  ...c,
                  subcategories: c.subcategories.map((s) =>
                    s.id === sub.id ? { ...s, name: res.name } : s
                  ),
                }
              : c
          )
        );
        this.editingSubcategoryId.set(null);
        this.toast.success('Subcategory updated');
      },
      error: () => this.toast.error('Failed to update subcategory'),
    });
  }

  deleteSubcategory(sub: SubcategoryEntry, cat: CategoryEntry): void {
    if (
      !confirm(
        `Delete "${sub.name}"?\n\nThis will remove the subcategory from all notes in "${cat.name}". Notes will not be deleted.`
      )
    )
      return;
    this.categoriesApi.deleteSubcategory(sub.id).subscribe({
      next: () => {
        this.loadedCategories.update((cats) =>
          cats.map((c) =>
            c.id === cat.id
              ? { ...c, subcategories: c.subcategories.filter((s) => s.id !== sub.id) }
              : c
          )
        );
        this.toast.success('Subcategory deleted');
      },
      error: () => this.toast.error('Failed to delete subcategory'),
    });
  }

  startAddBrowseSubcategory(): void {
    this.newBrowseSubName.set('');
    this.addingBrowseSub.set(true);
    setTimeout(() => this.newBrowseSubInputRef()?.nativeElement.focus(), 0);
  }

  createBrowseSubcategory(cat: CategoryEntry): void {
    const name = this.newBrowseSubName().trim();
    if (!name) {
      this.addingBrowseSub.set(false);
      return;
    }
    this.categoriesApi.createSubcategory(cat.id, name).subscribe({
      next: (res) => {
        this.loadedCategories.update((cats) =>
          cats.map((c) =>
            c.id === cat.id && !c.subcategories.find((s) => s.name === res.name)
              ? { ...c, subcategories: [...c.subcategories, { id: res.id, name: res.name }] }
              : c
          )
        );
        this.newBrowseSubName.set('');
        this.addingBrowseSub.set(false);
        this.toast.success('Subcategory created');
      },
      error: () => this.toast.error('Failed to create subcategory'),
    });
  }
}
