import { Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { NotesApi } from '../../core/services/notes';
import { Note } from '../../core/models/note.model';
import { NoteRow } from '../../shared/note-row/note-row';
import { QuickAddDialog } from './quick-add-dialog/quick-add-dialog';

@Component({
  selector: 'app-home',
  imports: [FormsModule, MatButtonModule, MatIconModule, NoteRow],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private notesApi = inject(NotesApi);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  protected readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  protected readonly query = signal('');
  protected readonly recentNotes = signal<Note[]>([]);

  ngOnInit(): void {
    this.loadRecentNotes();
  }

  private loadRecentNotes(): void {
    this.notesApi.list().subscribe({
      next: (res) => this.recentNotes.set(res.notes.slice(0, 6)),
      error: () => this.recentNotes.set([]),
    });
  }

  focusSearch(): void {
    this.searchInput()?.nativeElement.focus();
  }

  goSearch(): void {
    const q = this.query().trim();
    this.router.navigate(['/search'], q ? { queryParams: { q } } : {});
  }

  openNote(id: string): void {
    this.router.navigate(['/notes', id]);
  }

  deleteNote(id: string): void {
    if (!confirm('Delete this note? This cannot be undone.')) return;
    this.notesApi.delete(id).subscribe(() => this.loadRecentNotes());
  }

  openQuickAdd(): void {
    this.dialog
      .open(QuickAddDialog, { width: '480px', maxWidth: '90vw' })
      .afterClosed()
      .subscribe((created) => {
        if (created) this.loadRecentNotes();
      });
  }
}
