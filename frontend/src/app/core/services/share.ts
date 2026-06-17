import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ShareLink, SharedNote } from '../models/note.model';

@Service()
export class ShareApi {
  private http = inject(HttpClient);

  create(noteId: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`/api/notes/${noteId}/share`, {});
  }

  list(noteId: string): Observable<{ shares: ShareLink[] }> {
    return this.http.get<{ shares: ShareLink[] }>(`/api/notes/${noteId}/shares`);
  }

  revoke(noteId: string, token: string): Observable<void> {
    return this.http.delete<void>(`/api/notes/${noteId}/share/${token}`);
  }

  getPublic(token: string): Observable<SharedNote> {
    return this.http.get<SharedNote>(`/api/share/${token}`);
  }
}
