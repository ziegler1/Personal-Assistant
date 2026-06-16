import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Service()
export class ExportApi {
  private http = inject(HttpClient);

  share(filename: string, mimeType: string, data: string): Observable<{ url: string }> {
    return this.http.post<{ url: string }>('/api/export/share', { filename, mimeType, data });
  }

  email(filename: string, mimeType: string, data: string, subject: string, to?: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>('/api/export/email', { filename, mimeType, data, subject, to });
  }

  emailText(subject: string, text: string, to?: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>('/api/export/email', { subject, text, to });
  }

  emailLink(fileId: string, to?: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>('/api/export/email-link', { fileId, to });
  }
}
