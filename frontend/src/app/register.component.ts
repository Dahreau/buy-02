import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-register',
  template: `
    <h3>Register</h3>
    <form (submit)="register($event)">
      <label>Name: <input name="name" [(ngModel)]="name"></label><br/>
      <label>Email: <input name="email" [(ngModel)]="email"></label><br/>
      <label>Password: <input type="password" name="password" [(ngModel)]="password"></label><br/>
      <label>Role: <select [(ngModel)]="role"><option value="CLIENT">Client</option><option value="SELLER">Seller</option></select></label><br/>
      <button type="submit">Register</button>
    </form>
    <div *ngIf="error" style="color:red">{{error}}</div>
  `
})
export class RegisterComponent {
  name=''; email=''; password=''; role='CLIENT'; error='';
  constructor(private auth: AuthService, private router: Router) {}

  register(evt: Event) {
    evt.preventDefault();
    this.error='';
    this.auth.register({ name: this.name, email: this.email, password: this.password, role: this.role }).subscribe({
      next: res => { this.auth.setToken(res.token); this.router.navigate(['/']); },
      error: err => { this.error = err.error?.error || 'Register failed'; }
    });
  }
}
