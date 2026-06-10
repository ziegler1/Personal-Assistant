import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { NotesApi } from '../../../core/services/notes';
import { CONTENT_TYPES, ContentType, NoteFile } from '../../../core/models/note.model';

@Component({
  selector: 'app-note-editor',
  imports: [
    FormsModule,
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
  protected readonly title = signal('');
  protected readonly content = signal('');
  protected readonly contentType = signal<ContentType>('text');
  protected readonly source = signal('');
  protected readonly tags = signal<string[]>([]);
  protected readonly tagInput = signal('');
  protected readonly files = signal<NoteFile[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);

  protected get isNew(): boolean {
    return this.noteId() === null;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.noteId.set(id);
    this.loading.set(true);
    this.notesApi.get(id).subscribe({
      next: (note) => {
        this.title.set(note.title);
        this.content.set(note.content);
        this.contentType.set(note.content_type);
        this.source.set(note.source ?? '');
        this.tags.set(note.tags);
        this.files.set(note.files);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
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
    const request = id ? this.notesApi.update(id, input) : this.notesApi.create(input);

    request.subscribe({
      next: (note) => {
        this.saving.set(false);
        this.router.navigate(['/notes', note.id]);
      },
      error: () => this.saving.set(false),
    });
  }

  delete(): void {
    const id = this.noteId();
    if (!id || !confirm('Delete this note? This cannot be undone.')) return;
    this.notesApi.delete(id).subscribe(() => this.router.navigate(['/notes']));
  }

  cancel(): void {
    this.router.navigate(['/notes']);
  }
}
