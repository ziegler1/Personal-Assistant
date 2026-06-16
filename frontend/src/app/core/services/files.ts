import { Service, inject } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NoteFile } from '../models/note.model';

@Service()
export class FilesApi {
  private http = inject(HttpClient);
  private base = '/api/files';

  list(): Observable<{ files: NoteFile[] }> {
    return this.http.get<{ files: NoteFile[] }>(this.base);
  }

  upload(file: File, noteId?: string): Observable<HttpEvent<NoteFile>> {
    const formData = new FormData();
    formData.append('file', file);
    if (noteId) formData.append('note_id', noteId);
    return this.http.post<NoteFile>(`${this.base}/upload`, formData, {
      reportProgress: true,
      observe: 'events',
    });
  }

  updateCategory(id: string, category: string | null, subcategory: string | null): Observable<Pick<NoteFile, 'id' | 'category' | 'subcategory'>> {
    return this.http.patch<Pick<NoteFile, 'id' | 'category' | 'subcategory'>>(`${this.base}/${id}`, { category, subcategory });
  }

  getDownloadUrl(id: string): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.base}/${id}/download`);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
