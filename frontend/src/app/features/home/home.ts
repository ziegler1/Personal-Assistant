import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { NotesApi } from '../../core/services/notes';
import { FilesApi } from '../../core/services/files';
import { ChatApi } from '../../core/services/chat';
import { HapticService } from '../../core/services/haptic';
import { ShareApi } from '../../core/services/share';
import { ToastService } from '../../core/services/toast';
import { Note } from '../../core/models/note.model';
import { NoteRow } from '../../shared/note-row/note-row';
import { NoteActionSheet } from '../../shared/note-action-sheet/note-action-sheet';
import { shareNote } from '../../shared/share-note';
import { HapticDirective } from '../../shared/haptic.directive';
import { QuickAddDialog } from './quick-add-dialog/quick-add-dialog';

interface RecentChat {
  content: string;
  time: string;
}

@Component({
  selector: 'app-home',
  imports: [FormsModule, MatButtonModule, MatIconModule, NoteRow, HapticDirective],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private notesApi = inject(NotesApi);
  private filesApi = inject(FilesApi);
  private chatApi = inject(ChatApi);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private bottomSheet = inject(MatBottomSheet);
  private haptic = inject(HapticService);
  private shareApi = inject(ShareApi);
  private toast = inject(ToastService);

  protected readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  protected readonly query = signal('');
  protected readonly recentNotes = signal<Note[]>([]);
  protected readonly recentNotesMobile = computed(() => this.recentNotes().slice(0, 5));
  protected readonly noteCount = signal(0);
  protected readonly fileCount = signal(0);
  protected readonly lastUpdated = signal('—');
  protected readonly recentChats = signal<RecentChat[]>([]);
  protected readonly fabOpen = signal(false);

  ngOnInit(): void {
    this.loadRecentNotes();
    this.loadFileCount();
    this.loadRecentChats();
  }

  private loadRecentNotes(): void {
    this.notesApi.list().subscribe({
      next: (res) => {
        this.recentNotes.set(res.notes.slice(0, 6));
        this.noteCount.set(res.notes.length);
        this.lastUpdated.set(res.notes[0] ? this.formatRelativeTime(res.notes[0].updated_at) : '—');
      },
      error: () => {
        this.recentNotes.set([]);
        this.noteCount.set(0);
        this.lastUpdated.set('—');
      },
    });
  }

  private loadFileCount(): void {
    this.filesApi.list().subscribe({
      next: (res) => this.fileCount.set(res.files.length),
      error: () => this.fileCount.set(0),
    });
  }

  private loadRecentChats(): void {
    this.chatApi.history().subscribe({
      next: (res) => {
        const userMessages = res.messages.filter((m) => m.role === 'user');
        this.recentChats.set(
          userMessages
            .slice(-3)
            .reverse()
            .map((m) => ({ content: m.content, time: this.formatRelativeTime(m.created_at) })),
        );
      },
      error: () => this.recentChats.set([]),
    });
  }

  private formatRelativeTime(dateStr: string): string {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.round(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  focusSearch(): void {
    this.searchInput()?.nativeElement.focus();
  }

  goSearch(): void {
    const q = this.query().trim();
    this.router.navigate(['/search'], q ? { queryParams: { q } } : {});
  }

  goFiles(): void {
    this.router.navigate(['/files']);
  }

  goChat(): void {
    this.router.navigate(['/chat']);
  }

  openNote(id: string): void {
    this.router.navigate(['/notes', id]);
  }

  deleteNote(id: string): void {
    if (!confirm('Delete this note? This cannot be undone.')) return;
    this.notesApi.delete(id).subscribe({
      next: () => {
        this.loadRecentNotes();
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
        }
      });
  }

  openQuickAdd(): void {
    this.dialog
      .open(QuickAddDialog, { width: '480px', maxWidth: '90vw' })
      .afterClosed()
      .subscribe((created) => {
        if (created) this.loadRecentNotes();
      });
  }

  toggleFab(): void {
    this.haptic.tap();
    this.fabOpen.set(!this.fabOpen());
  }

  closeFab(): void {
    this.fabOpen.set(false);
  }

  newNoteFromFab(): void {
    this.closeFab();
    this.openQuickAdd();
  }

  uploadFileFromFab(): void {
    this.closeFab();
    this.goFiles();
  }
}
