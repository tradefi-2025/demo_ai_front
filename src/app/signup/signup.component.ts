import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  email: string = '';
  name: string = '';
  password: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  signUp() {
    if (!this.email || !this.name || !this.password) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    
    this.authService.signUp({
      email: this.email,
      name: this.name,
      password: this.password
    }).subscribe({
      next: (message) => {
        this.authService.signIn({
          email: this.email,
          password: this.password
        }).subscribe({
          next: () => {
            this.router.navigate(['']);
          },
          error: (err) => {
            this.isLoading = false;
            this.errorMessage = 'Account created, but unable to login automatically. Please login manually.';
            setTimeout(() => {
              this.router.navigate(['/sign-in']);
            }, 2000);
          }
        });
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error?.error?.message || 'An error occurred during registration. Please try again.';
      }
    });
  }
}