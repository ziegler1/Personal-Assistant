import { Service, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ContentType, Note, NoteWithFiles, SearchResult } from '../models/note.model';

export interface NoteFilters {
  tag?: string;
  contentType?: ContentType;
}

export interface CreateNoteInput {
  title: string;
  content?: string;
  content_type?: ContentType;
  source?: string | null;
  tags?: string[];
}

export type UpdateNoteInput = Partial<CreateNoteInput>;

@Service()
export class NotesApi {
  private http = inject(HttpClient);
  private base = '/api/notes';

  list(filters: NoteFilters = {}): Observable<{ notes: Note[] }> {
    return this.http.get<{ notes: Note[] }>(this.base, { params: this.buildParams(filters) });
  }

  search(query: string, filters: NoteFilters = {}): Observable<{ results: SearchResult[] }> {
    const params = this.buildParams(filters).set('q', query);
    return this.http.get<{ results: SearchResult[] }>(`${this.base}/search`, { params });
  }

  get(id: string): Observable<NoteWithFiles> {
    return this.http.get<NoteWithFiles>(`${this.base}/${id}`);
  }

  create(input: CreateNoteInput): Observable<Note> {
    return this.http.post<Note>(this.base, input);
  }

  update(id: string, input: UpdateNoteInput): Observable<Note> {
    return this.http.put<Note>(`${this.base}/${id}`, input);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  private buildParams(filters: NoteFilters): HttpParams {
    let params = new HttpParams();
    if (filters.tag) params = params.set('tag', filters.tag);
    if (filters.contentType) params = params.set('content_type', filters.contentType);
    return params;
  }
}
