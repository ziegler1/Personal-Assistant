import { Service, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';

@Service()
export class AuthService {
  private http = inject(HttpClient);
  readonly isAuthenticated = signal<boolean | null>(null);

  checkAuth(): Observable<boolean> {
    return this.http.get('/api/auth/me').pipe(
      map(() => true),
      catchError(() => of(false)),
      tap((v) => this.isAuthenticated.set(v)),
    );
  }

  login(password: string): Observable<void> {
    return this.http.post<void>('/api/auth/login', { password }).pipe(
      tap(() => this.isAuthenticated.set(true)),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/auth/logout', {}).pipe(
      tap(() => this.isAuthenticated.set(false)),
    );
  }

  clearAuth(): void {
    this.isAuthenticated.set(false);
  }
}
