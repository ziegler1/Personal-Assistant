import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatSliderModule } from '@angular/material/slider';
import { NotesApi } from '../../core/services/notes';
import { SearchResult } from '../../core/models/note.model';

const MIN_RELEVANCE_STORAGE_KEY = 'search.minRelevance';

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
    MatSliderModule,
  ],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class Search implements OnInit {
  private notesApi = inject(NotesApi);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  protected readonly query = signal('');
  protected readonly results = signal<SearchResult[]>([]);
  protected readonly loading = signal(false);
  protected readonly searched = signal(false);
  protected readonly minRelevance = signal(loadMinRelevance());

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap.get('q');
    if (q) {
      this.query.set(q);
      this.search();
    }
  }

  setMinRelevance(value: number): void {
    this.minRelevance.set(value);
    localStorage.setItem(MIN_RELEVANCE_STORAGE_KEY, String(value));
  }

  search(): void {
    const q = this.query().trim();
    if (!q) return;

    this.loading.set(true);
    this.searched.set(true);
    this.notesApi.search(q, {}, this.minRelevance() / 100).subscribe({
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

function loadMinRelevance(): number {
  const stored = localStorage.getItem(MIN_RELEVANCE_STORAGE_KEY);
  if (stored === null) return 50;
  const value = Number(stored);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 50;
}
