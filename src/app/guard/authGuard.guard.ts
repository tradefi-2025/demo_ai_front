import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated$.pipe(
    take(1),
    map((isAuth: boolean) => {
      if (isAuth) {
        return true;
      } else {
        return router.createUrlTree(['/sign-in']);
      }
    }),
    catchError(() => {
      return of(router.createUrlTree(['/sign-in']));
    })
  );
};
