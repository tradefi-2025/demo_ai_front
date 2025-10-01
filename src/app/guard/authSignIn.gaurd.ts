import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthSignGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ) {

    
    // Vérification côté serveur (fiable)
    return this.authService.verifySession().pipe(
      map((isAuth: boolean) => {
        if (!isAuth) {
          console.log("Non authentifié, autorisation d'accéder à la page de login");
          return true; // Autorise l'accès à signin/signup
        } else {
          console.log("Authentifié côté serveur, redirection vers /");
          return this.router.createUrlTree(['/']);
          ;
        }
      }),
      catchError(() => {
        console.log("Erreur de vérification, autorisation par défaut");
        return of(true); // En cas d'erreur, on autorise l'accès
      })
    );
  }
}