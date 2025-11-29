import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthSignGuard {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ) {

    
    // Vérification côté serveur (fiable)
    return this.authService.isAuthenticated$.pipe(
      map((isAuth: boolean) => {
        if (!isAuth) {
          return true; // Autorise l'accès à signin/signup
        } else {
          return this.router.createUrlTree(['/']);
          ;
        }
      }),
      catchError(() => {
        return of(true); // En cas d'erreur, on autorise l'accès
      })
    );
  }
}