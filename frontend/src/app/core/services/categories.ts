import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CategoryEntry } from '../models/note.model';

export interface CategoryApiResponse {
  id: string;
  name: string;
  icon: string;
  sort_order?: number;
}

export interface SubcategoryApiResponse {
  id: string;
  name: string;
  category_name?: string;
}

@Service()
export class CategoriesApi {
  private http = inject(HttpClient);
  private base = '/api/categories';

  list(): Observable<{ categories: CategoryEntry[] }> {
    return this.http.get<{ categories: CategoryEntry[] }>(this.base);
  }

  create(name: string, icon = '📁'): Observable<CategoryApiResponse> {
    return this.http.post<CategoryApiResponse>(this.base, { name, icon });
  }

  update(id: string, name: string, icon: string): Observable<CategoryApiResponse> {
    return this.http.put<CategoryApiResponse>(`${this.base}/${id}`, { name, icon });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  createSubcategory(categoryNameOrId: string, name: string): Observable<SubcategoryApiResponse> {
    return this.http.post<SubcategoryApiResponse>(
      `${this.base}/${encodeURIComponent(categoryNameOrId)}/subcategories`,
      { name }
    );
  }

  updateSubcategory(id: string, name: string): Observable<SubcategoryApiResponse> {
    return this.http.put<SubcategoryApiResponse>(`${this.base}/subcategories/${id}`, { name });
  }

  deleteSubcategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/subcategories/${id}`);
  }
}
