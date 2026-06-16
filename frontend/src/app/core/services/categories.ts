import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CategoryEntry } from '../models/note.model';

@Service()
export class CategoriesApi {
  private http = inject(HttpClient);
  private base = '/api/categories';

  list(): Observable<{ categories: CategoryEntry[] }> {
    return this.http.get<{ categories: CategoryEntry[] }>(this.base);
  }

  create(name: string): Observable<{ name: string }> {
    return this.http.post<{ name: string }>(this.base, { name });
  }

  createSubcategory(categoryName: string, name: string): Observable<{ name: string }> {
    return this.http.post<{ name: string }>(
      `${this.base}/${encodeURIComponent(categoryName)}/subcategories`,
      { name }
    );
  }
}
