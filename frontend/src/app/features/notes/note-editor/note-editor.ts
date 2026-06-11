import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { NotesApi } from '../../../core/services/notes';
import { CONTENT_TYPES, ContentType, Note, NoteFile } from '../../../core/models/note.model';

interface NoteFormSnapshot {
  title: string;
  content: string;
  contentType: ContentType;
  source: string;
  tags: string[];
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
    MatSelectModule,
    MatChipsModule,
  ],
  templateUrl: './note-editor.html',
  styleUrl: './note-editor.scss',
})
export class NoteEditor implements OnInit {
  private notesApi = inject(NotesApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected readonly contentTypes = CONTENT_TYPES;
  protected readonly noteId = signal<string | null>(null);
  protected readonly mode = signal<'view' | 'edit'>('edit');
  protected readonly title = signal('');
  protected readonly content = signal('');
  protected readonly contentType = signal<ContentType>('text');
  protected readonly source = signal('');
  protected readonly tags = signal<string[]>([]);
  protected readonly tagInput = signal('');
  protected readonly updatedAt = signal('');
  protected readonly files = signal<NoteFile[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);

  private snapshot: NoteFormSnapshot | null = null;

  protected get isNew(): boolean {
    return this.noteId() === null;
  }

  protected get sourceIsUrl(): boolean {
    return /^https?:\/\//i.test(this.source());
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.noteId.set(id);
    this.mode.set('view');
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

  private applyNote(note: Note): void {
    this.title.set(note.title);
    this.content.set(note.content);
    this.contentType.set(note.content_type);
    this.source.set(note.source ?? '');
    this.tags.set(note.tags);
    this.updatedAt.set(note.updated_at);
    this.snapshot = {
      title: note.title,
      content: note.content,
      contentType: note.content_type,
      source: note.source ?? '',
      tags: [...note.tags],
    };
  }

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
    };

    const id = this.noteId();
    if (id) {
      this.notesApi.update(id, input).subscribe({
        next: (note) => {
          this.saving.set(false);
          this.applyNote(note);
          this.mode.set('view');
        },
        error: () => this.saving.set(false),
      });
    } else {
      this.notesApi.create(input).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/notes']);
        },
        error: () => this.saving.set(false),
      });
    }
  }

  delete(): void {
    const id = this.noteId();
    if (!id || !confirm('Delete this note? This cannot be undone.')) return;
    this.notesApi.delete(id).subscribe(() => this.router.navigate(['/notes']));
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
    }
    this.tagInput.set('');
    this.mode.set('view');
  }

  backToList(): void {
    this.router.navigate(['/notes']);
  }
}
