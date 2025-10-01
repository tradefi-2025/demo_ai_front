import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { SignInDto } from '../models/request/sign-in-dto';
import { ɵparseCookieValue } from '@angular/common';


@Component({
  selector: 'app-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.css']
})
export class SigninComponent implements OnInit {
  email : string='';
  password : string='';
  isLoginError : Boolean = false;
  errorMsg : string = '';
  isLoading : Boolean = false;
  
  // Login attempt limiting
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes in milliseconds
  private loginAttempts = 0;
  private lockedUntil: number | null = null;
  isLocked: Boolean = false;
  remainingLockTime: string = '';

  constructor(
    private authService :AuthService, 
    private router : Router
  ){}
  
  ngOnInit(): void {
    // Check if there's lock information in localStorage
    const lockedUntilStr = localStorage.getItem('loginLockedUntil');
    const attemptsStr = localStorage.getItem('loginAttempts');
    
    if (lockedUntilStr) {
      this.lockedUntil = parseInt(lockedUntilStr, 10);
      this.checkLockStatus();
    }
    
    if (attemptsStr) {
      this.loginAttempts = parseInt(attemptsStr, 10);
    }
  }

  signin(): void {
    // Check if account is locked
    if (this.checkLockStatus()) {
      this.isLoginError = true;
      this.errorMsg = `Too many failed attempts. Please try again in ${this.remainingLockTime}.`;
      return;
    }
    
    this.isLoading = true;
    this.isLoginError = false;
    
    const signInDto: SignInDto = {
      email: this.email,
      password: this.password
    };
    
    this.authService.signIn(signInDto).subscribe({
      next: () => {
        // Reset login attempts on successful login
        this.resetLockout();
        this.router.navigate(['']);
      },
      error: (error) => { 
        this.loginError(error);
        this.isLoginError = true;
        this.isLoading = false; // Stop loading state on error
        
        // Increment login attempts on failure
        this.incrementLoginAttempts();
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  loginError(error: any): void {
    // Clear password field but keep email for better UX
    this.password = "";
    
    // Handle specific error types with user-friendly messages
    if (error.status === 401 || error.status === 403) {
      this.errorMsg = 'Invalid email or password. Please try again.';
    } else if (error.status === 404) {
      this.errorMsg = 'Account not found. Please check your email or create a new account.';
    } else if (error.status === 0) {
      this.errorMsg = 'Unable to connect to the server. Please check your internet connection.';
    } else {
      this.errorMsg = 'An error occurred while signing in. Please try again later.';
    }
  }

  notTouched(): boolean {
    // We now want to show the error even if only the password is empty
    // This allows the error to be shown after an unsuccessful login attempt
    return true;
  }

  private checkLockStatus(): boolean {
    if (!this.lockedUntil) return false;
    
    const now = Date.now();
    if (now < this.lockedUntil) {
      // Still locked, calculate remaining time
      const remainingMs = this.lockedUntil - now;
      const minutes = Math.floor(remainingMs / 60000);
      const seconds = Math.floor((remainingMs % 60000) / 1000);
      
      this.remainingLockTime = `${minutes}m ${seconds}s`;
      this.isLocked = true;
      
      // Update localStorage in case the remaining time changed
      localStorage.setItem('loginLockedUntil', this.lockedUntil.toString());
      
      return true;
    } else {
      // Lock period is over, reset
      this.resetLockout();
      return false;
    }
  }
  
  private incrementLoginAttempts(): void {
    this.loginAttempts++;
    localStorage.setItem('loginAttempts', this.loginAttempts.toString());
    
    if (this.loginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      this.lockedUntil = Date.now() + this.LOCKOUT_DURATION_MS;
      this.isLocked = true;
      
      // Store in localStorage
      localStorage.setItem('loginLockedUntil', this.lockedUntil.toString());
      
      // Start countdown timer
      this.updateLockCountdown();
    }
  }
  
  private updateLockCountdown(): void {
    const interval = setInterval(() => {
      if (!this.checkLockStatus()) {
        clearInterval(interval);
      }
    }, 1000);
  }
  
  private resetLockout(): void {
    this.loginAttempts = 0;
    this.lockedUntil = null;
    this.isLocked = false;
    this.remainingLockTime = '';
    
    // Clear localStorage
    localStorage.removeItem('loginAttempts');
    localStorage.removeItem('loginLockedUntil');
  }


}
