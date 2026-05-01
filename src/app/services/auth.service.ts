import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environnement/environment';
import { SignUpDto } from "../models/request/sign-up-dto";
import { SignInDto } from "../models/request/sign-in-dto";
import { SignInResponseDto } from "../models/reponse/sign-in-response-dto"
import { BehaviorSubject, Observable, ReplaySubject, tap, of } from "rxjs";
import { Router } from '@angular/router';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = environment.apiBaseUrl;

  private isAuthenticatedSubject = new ReplaySubject<boolean>(1);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  private userDetailsSubject = new BehaviorSubject<SignInResponseDto | null>(null);
  public userDetails$ = this.userDetailsSubject.asObservable();



  constructor(private readonly http: HttpClient, private readonly router: Router) {
    this.loadAuthenticationState().subscribe();
  }

  private loadAuthenticationState(): Observable<boolean> {
    return this.http.get<SignInResponseDto>(`${this.baseUrl}/user/me`,
      { withCredentials: true }
    ).pipe(
      map(userDetails => {
        this.isAuthenticatedSubject.next(true);
        this.userDetailsSubject.next(userDetails);
        return true;
      }),
      catchError(() => {
        this.isAuthenticatedSubject.next(false);
        this.userDetailsSubject.next(null);
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
      tap((userDetails: SignInResponseDto) => {
        this.userDetailsSubject.next(userDetails);
      }),
      tap(() => this.isAuthenticatedSubject.next(true))
    );
  }

  signUp(signUpDto: SignUpDto): Observable<string> {
    return this.http.post(
      this.baseUrl + "/auth/inscription",
      signUpDto, { responseType: 'text' })
  }


  signOut(): void {
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




}
