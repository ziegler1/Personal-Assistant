import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const known = auth.isAuthenticated();
  if (known === true) return true;
  if (known === false) return router.createUrlTree(['/login']);

  return auth.checkAuth().pipe(
    map((ok) => (ok ? true : router.createUrlTree(['/login']))),
  );
};
