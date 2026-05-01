import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authSignGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Vérification côté serveur (fiable)
  return authService.isAuthenticated$.pipe(
    take(1),
    map((isAuth: boolean) => {
      if (!isAuth) {
        return true; // Autorise l'accès à signin/signup
      } else {
        return router.createUrlTree(['/']);
      }
    }),
    catchError(() => {
      return of(true); // En cas d'erreur, on autorise l'accès
    })
  );
};
