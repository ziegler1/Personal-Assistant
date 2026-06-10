import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { NotesApi } from '../../core/services/notes';
import { SearchResult } from '../../core/models/note.model';

@Component({
  selector: 'app-search',
  imports: [
    FormsModule,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
  ],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class Search {
  private notesApi = inject(NotesApi);
  private router = inject(Router);

  protected readonly query = signal('');
  protected readonly results = signal<SearchResult[]>([]);
  protected readonly loading = signal(false);
  protected readonly searched = signal(false);

  search(): void {
    const q = this.query().trim();
    if (!q) return;

    this.loading.set(true);
    this.searched.set(true);
    this.notesApi.search(q).subscribe({
      next: (res) => {
        this.results.set(res.results);
        this.loading.set(false);
      },
      error: () => {
        this.results.set([]);
        this.loading.set(false);
      },
    });
  }

  openNote(id: string): void {
    this.router.navigate(['/notes', id]);
  }
}
