import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated$.pipe(
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
