import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { NotesApi } from '../../core/services/notes';
import { SearchResult } from '../../core/models/note.model';

const MIN_RELEVANCE_STORAGE_KEY = 'search.minRelevance';
const RECENT_SEARCHES_STORAGE_KEY = 'search.recent';
const SEARCH_DEBOUNCE_MS = 300;
const MAX_RECENT_SEARCHES = 5;

@Component({
  selector: 'app-search',
  imports: [FormsModule, DecimalPipe, MatButtonModule, MatIconModule, MatSliderModule],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class Search implements OnInit, AfterViewInit, OnDestroy {
  private notesApi = inject(NotesApi);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly query = signal('');
  protected readonly results = signal<SearchResult[]>([]);
  protected readonly loading = signal(false);
  protected readonly searched = signal(false);
  protected readonly minRelevance = signal(loadMinRelevance());
  protected readonly recentSearches = signal<string[]>(loadRecentSearches());

  private debounceTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap.get('q');
    if (q) {
      this.query.set(q);
      this.search();
    }
  }

  ngAfterViewInit(): void {
    this.searchInput()?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    clearTimeout(this.debounceTimer);
  }

  onQueryInput(value: string): void {
    this.query.set(value);
    clearTimeout(this.debounceTimer);

    if (!value.trim()) {
      this.results.set([]);
      this.searched.set(false);
      return;
    }

    this.debounceTimer = setTimeout(() => this.search(), SEARCH_DEBOUNCE_MS);
  }

  setMinRelevance(value: number): void {
    this.minRelevance.set(value);
    localStorage.setItem(MIN_RELEVANCE_STORAGE_KEY, String(value));

    if (!this.query().trim()) return;
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.search(), SEARCH_DEBOUNCE_MS);
  }

  search(): void {
    const q = this.query().trim();
    if (!q) return;

    clearTimeout(this.debounceTimer);
    this.loading.set(true);
    this.searched.set(true);
    this.notesApi.search(q, {}, this.minRelevance() / 100).subscribe({
      next: (res) => {
        this.results.set(res.results);
        this.loading.set(false);
        this.saveRecentSearch(q);
      },
      error: () => {
        this.results.set([]);
        this.loading.set(false);
      },
    });
  }

  useRecentSearch(term: string): void {
    this.query.set(term);
    this.search();
  }

  clearRecentSearches(): void {
    this.recentSearches.set([]);
    localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
  }

  openNote(id: string): void {
    this.router.navigate(['/notes', id]);
  }

  private saveRecentSearch(term: string): void {
    const existing = this.recentSearches().filter((s) => s.toLowerCase() !== term.toLowerCase());
    const updated = [term, ...existing].slice(0, MAX_RECENT_SEARCHES);
    this.recentSearches.set(updated);
    localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
  }
}

function loadMinRelevance(): number {
  const stored = localStorage.getItem(MIN_RELEVANCE_STORAGE_KEY);
  if (stored === null) return 50;
  const value = Number(stored);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 50;
}

function loadRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string').slice(0, MAX_RECENT_SEARCHES) : [];
  } catch {
    return [];
  }
}
