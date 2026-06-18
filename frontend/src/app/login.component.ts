import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <h3>Login</h3>
    <form (submit)="login($event)">
      <label>Email: <input name="email" [(ngModel)]="email"></label><br/>
      <label>Password: <input type="password" name="password" [(ngModel)]="password"></label><br/>
      <button type="submit">Login</button>
    </form>
    <div *ngIf="error" style="color:red">{{error}}</div>
  `
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  constructor(private auth: AuthService, private router: Router) {}

  login(evt: Event) {
    evt.preventDefault();
    this.error = '';
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: res => { this.auth.setToken(res.token); this.router.navigate(['/']); },
      error: err => { this.error = err.error?.error || 'Login failed'; }
    });
  }
}
