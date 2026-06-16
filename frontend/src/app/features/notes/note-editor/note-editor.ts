import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MarkdownModule } from 'ngx-markdown';
import { NotesApi } from '../../../core/services/notes';
import { CategoriesApi } from '../../../core/services/categories';
import { ExportApi } from '../../../core/services/export';
import { ToastService } from '../../../core/services/toast';
import { CATEGORIES, CONTENT_TYPES, CategoryEntry, ContentType, Note, NoteFile, SUBCATEGORIES } from '../../../core/models/note.model';
import { HapticDirective } from '../../../shared/haptic.directive';

interface NoteFormSnapshot {
  title: string;
  content: string;
  contentType: ContentType;
  source: string;
  tags: string[];
  category: string | null;
  subcategory: string | null;
}

@Component({
  selector: 'app-note-editor',
  imports: [
    FormsModule,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatAutocompleteModule,
    MatButtonToggleModule,
    TextFieldModule,
    MarkdownModule,
    HapticDirective,
  ],
  templateUrl: './note-editor.html',
  styleUrl: './note-editor.scss',
})
export class NoteEditor implements OnInit {
  private notesApi = inject(NotesApi);
  private categoriesApi = inject(CategoriesApi);
  private exportApi = inject(ExportApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  private newCatInputRef = viewChild<ElementRef<HTMLInputElement>>('newCatInput');
  private newSubInputRef = viewChild<ElementRef<HTMLInputElement>>('newSubInput');

  protected readonly contentTypes = CONTENT_TYPES;
  protected readonly noteId = signal<string | null>(null);
  protected readonly mode = signal<'view' | 'edit'>('edit');
  protected readonly title = signal('');
  protected readonly content = signal('');
  protected readonly contentType = signal<ContentType>('text');
  protected readonly source = signal('');
  protected readonly tags = signal<string[]>([]);
  protected readonly category = signal<string | null>(null);
  protected readonly subcategory = signal<string | null>(null);
  protected readonly loadedCategories = signal<CategoryEntry[]>([]);
  protected readonly subcategoriesForCategory = computed(() => {
    const cat = this.category();
    if (!cat) return [];
    return this.loadedCategories().find((c) => c.name === cat)?.subcategories ?? [];
  });

  // Inline create state
  protected readonly addingCategory = signal(false);
  protected readonly newCategoryName = signal('');
  protected readonly addingSubcategory = signal(false);
  protected readonly newSubcategoryName = signal('');

  protected readonly tagInput = signal('');
  protected readonly allTags = signal<string[]>([]);
  protected readonly filteredTags = computed(() => {
    const input = this.tagInput().trim().toLowerCase();
    const current = this.tags();
    return this.allTags().filter(
      (tag) => !current.includes(tag) && (!input || tag.toLowerCase().includes(input))
    );
  });
  protected readonly updatedAt = signal('');
  protected readonly charCount = computed(() => this.content().length);
  protected readonly wordCount = computed(() => {
    const trimmed = this.content().trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  });
  protected readonly files = signal<NoteFile[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showRaw = signal(false);

  private snapshot: NoteFormSnapshot | null = null;

  protected get isNew(): boolean {
    return this.noteId() === null;
  }

  protected get sourceIsUrl(): boolean {
    return /^https?:\/\//i.test(this.source());
  }

  ngOnInit(): void {
    this.loadCategories();

    this.notesApi.tags().subscribe({
      next: (res) => this.allTags.set(res.tags),
      error: () => this.allTags.set([]),
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.noteId.set(id);
    this.mode.set(this.route.snapshot.queryParamMap.get('edit') ? 'edit' : 'view');
    this.loading.set(true);
    this.notesApi.get(id).subscribe({
      next: (note) => {
        this.applyNote(note);
        this.files.set(note.files);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadCategories(): void {
    this.categoriesApi.list().subscribe({
      next: (res) => this.loadedCategories.set(res.categories),
      error: () =>
        this.loadedCategories.set(
          CATEGORIES.map((name) => ({ name, subcategories: [...(SUBCATEGORIES[name] as string[])] }))
        ),
    });
  }

  private applyNote(note: Note): void {
    this.title.set(note.title);
    this.content.set(note.content);
    this.contentType.set(note.content_type);
    this.source.set(note.source ?? '');
    this.tags.set(note.tags);
    this.category.set(note.category ?? null);
    this.subcategory.set(note.subcategory ?? null);
    this.updatedAt.set(note.updated_at);
    this.snapshot = {
      title: note.title,
      content: note.content,
      contentType: note.content_type,
      source: note.source ?? '',
      tags: [...note.tags],
      category: note.category ?? null,
      subcategory: note.subcategory ?? null,
    };
  }

  setCategory(cat: string): void {
    if (this.category() === cat) {
      this.category.set(null);
      this.subcategory.set(null);
    } else {
      this.category.set(cat);
      this.subcategory.set(null);
    }
    this.addingSubcategory.set(false);
    this.newSubcategoryName.set('');
  }

  startAddingCategory(): void {
    this.addingCategory.set(true);
    setTimeout(() => this.newCatInputRef()?.nativeElement.focus(), 0);
  }

  createCategory(): void {
    const name = this.newCategoryName().trim().toUpperCase();
    if (!name) {
      this.addingCategory.set(false);
      return;
    }
    this.categoriesApi.create(name).subscribe({
      next: (res) => {
        if (!this.loadedCategories().find((c) => c.name === res.name)) {
          this.loadedCategories.update((cats) => [...cats, { name: res.name, subcategories: [] }]);
        }
        this.category.set(res.name);
        this.subcategory.set(null);
        this.newCategoryName.set('');
        this.addingCategory.set(false);
      },
      error: () => this.toast.error('Failed to create category'),
    });
  }

  startAddingSubcategory(): void {
    this.addingSubcategory.set(true);
    setTimeout(() => this.newSubInputRef()?.nativeElement.focus(), 0);
  }

  createSubcategory(): void {
    const cat = this.category();
    const name = this.newSubcategoryName().trim();
    if (!cat || !name) {
      this.addingSubcategory.set(false);
      return;
    }
    this.categoriesApi.createSubcategory(cat, name).subscribe({
      next: (res) => {
        this.loadedCategories.update((cats) =>
          cats.map((c) =>
            c.name === cat && !c.subcategories.includes(res.name)
              ? { ...c, subcategories: [...c.subcategories, res.name] }
              : c
          )
        );
        this.subcategory.set(res.name);
        this.newSubcategoryName.set('');
        this.addingSubcategory.set(false);
      },
      error: () => this.toast.error('Failed to create subcategory'),
    });
  }

  addTag(): void {
    const value = this.tagInput().trim();
    if (value && !this.tags().includes(value)) {
      this.tags.set([...this.tags(), value]);
    }
    this.tagInput.set('');
  }

  selectTag(tag: string): void {
    if (!this.tags().includes(tag)) {
      this.tags.set([...this.tags(), tag]);
    }
    this.tagInput.set('');
  }

  removeTag(tag: string): void {
    this.tags.set(this.tags().filter((t) => t !== tag));
  }

  edit(): void {
    this.mode.set('edit');
  }

  save(): void {
    if (!this.title().trim() || this.saving()) return;

    this.saving.set(true);
    const input = {
      title: this.title().trim(),
      content: this.content(),
      content_type: this.contentType(),
      source: this.source().trim() || null,
      tags: this.tags(),
      category: this.category(),
      subcategory: this.subcategory(),
    };

    const id = this.noteId();
    if (id) {
      this.notesApi.update(id, input).subscribe({
        next: (note) => {
          this.saving.set(false);
          this.applyNote(note);
          this.mode.set('view');
          this.toast.success('Note saved');
        },
        error: () => {
          this.saving.set(false);
          this.toast.error('Failed to save note');
        },
      });
    } else {
      this.notesApi.create(input).subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success('Note saved');
          this.router.navigate(['/notes']);
        },
        error: () => {
          this.saving.set(false);
          this.toast.error('Failed to save note');
        },
      });
    }
  }

  delete(): void {
    const id = this.noteId();
    if (!id || !confirm('Delete this note? This cannot be undone.')) return;
    this.notesApi.delete(id).subscribe({
      next: () => {
        this.toast.success('Note deleted');
        this.router.navigate(['/notes']);
      },
      error: () => this.toast.error('Failed to delete note'),
    });
  }

  cancel(): void {
    if (this.isNew) {
      this.router.navigate(['/notes']);
      return;
    }

    if (this.snapshot) {
      this.title.set(this.snapshot.title);
      this.content.set(this.snapshot.content);
      this.contentType.set(this.snapshot.contentType);
      this.source.set(this.snapshot.source);
      this.tags.set([...this.snapshot.tags]);
      this.category.set(this.snapshot.category);
      this.subcategory.set(this.snapshot.subcategory);
    }
    this.tagInput.set('');
    this.addingCategory.set(false);
    this.addingSubcategory.set(false);
    this.mode.set('view');
  }

  downloadAsMarkdown(): void {
    const filename = `${this.title().replace(/[/\\?%*:|"<>]/g, '-') || 'note'}.md`;
    const blob = new Blob([`# ${this.title()}\n\n${this.content()}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  emailNote(): void {
    const to = window.prompt('Send to email address:');
    if (to === null) return;
    const text = `# ${this.title()}\n\n${this.content()}`;
    this.exportApi.emailText(this.title(), text, to || undefined).subscribe({
      next: () => this.toast.success('Note emailed'),
      error: (err) => this.toast.error(err?.error?.error || 'Failed to send email. Check SMTP configuration.'),
    });
  }

  backToList(): void {
    this.router.navigate(['/notes']);
  }
}
