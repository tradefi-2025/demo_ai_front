import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { map, catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {

    constructor(private authService : AuthService , private router: Router){}

canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ){
    
    return this.authService.isAuthenticated$.pipe(
      map((isAuth: boolean) => {
        
        if (isAuth) {
          console.log("i am here and i am allwing")
          return true;
        } else {
          console.log("i am here and i am not allwing")
          return this.router.createUrlTree(['/sign-in']);
          
        }
      }),
      catchError(() => {
        return of(this.router.createUrlTree(['/sign-in']));
      })
    );
  }


}