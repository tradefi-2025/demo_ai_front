import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environnement/environment';
import { SignUpDto } from "../models/request/sign-up-dto";
import { SignInDto } from "../models/request/sign-in-dto";
import { SignInResponseDto } from "../models/reponse/sign-in-response-dto"
import { BehaviorSubject, Observable, tap, of } from "rxjs";
import { Router } from '@angular/router';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = environment.apiUrl;

  // Initialise avec la valeur de sessionStorage (pour éviter le flash d'UI)
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.isAuthenticated());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private readonly http: HttpClient, private readonly router: Router) {
    // Vérifie la session au démarrage pour synchroniser avec le serveur
    this.verifySession().subscribe();
  }
  
  verifySession(): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/auth/auth-check`, 
      { withCredentials: true }
    ).pipe(
      map(resp => {
        const ok = resp;
        this.isAuthenticatedSubject.next(ok);
        
        // Si le serveur dit que la session n'est plus valide, nettoyer le stockage local
        if (!ok) {
          this.clearSession();
        }
        
        return ok;
      }),
      catchError(err => {
        // En cas d'erreur, supposer non authentifié
        this.isAuthenticatedSubject.next(false);
        return of(false);
      })
    );
  }

  signIn(signInDto: SignInDto): Observable<SignInResponseDto> {
    return this.http.post<SignInResponseDto>(
      this.baseUrl + "/auth/login",
      signInDto,
      { withCredentials: true }
    ).pipe(
      tap((response) => this.setSession({
        userId: response.userId,
        name: response.name,
        userEmail: signInDto.email
      }))
    );
  }

  signUp(signUpDto : SignUpDto): Observable<string> {
    return this.http.post(
      this.baseUrl+"/auth/inscription",
      signUpDto , { responseType: 'text'} ) 
  }

  setSession(sessionData: { userId: string, userEmail: string, name: string }) {
    sessionStorage.setItem("userId", sessionData.userId);
    sessionStorage.setItem("userEmail", sessionData.userEmail);
    sessionStorage.setItem("name", sessionData.name);
    this.isAuthenticatedSubject.next(true);
  }

  clearSession() {
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("userEmail");
    sessionStorage.removeItem("name");
  }

  signOut(): void {
    this.clearSession();
    this.http.post<any>(this.baseUrl + "/auth/logout", null, 
      { withCredentials: true }
    ).subscribe({
      next: () => {
        this.isAuthenticatedSubject.next(false);
        this.router.navigate(["/sign-in"]);
      },
      error: () => {
        this.isAuthenticatedSubject.next(false);
        this.router.navigate(["/sign-in"]);
      }
    });
  }

  isAuthenticated(): boolean {
    return !!(sessionStorage.getItem('name') && 
              sessionStorage.getItem('userId') && 
              sessionStorage.getItem('userEmail'));
  }


}