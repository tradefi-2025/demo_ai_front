import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authSignGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Vérification côté serveur (fiable)
  return authService.isAuthenticated$.pipe(
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
