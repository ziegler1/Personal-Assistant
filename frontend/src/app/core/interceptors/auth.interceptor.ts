import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  const outgoing = req.url.startsWith('/api/') ? req.clone({ withCredentials: true }) : req;

  return next(outgoing).pipe(
    catchError((err) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && !req.url.includes('/api/auth/')) {
        auth.clearAuth();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};
