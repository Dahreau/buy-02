import { Component, ViewChild } from '@angular/core';
import { CartComponent } from './cart.component';
import { AuthService } from './services/auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  // styleUrls: ['./app.component.css']   // ← SUPPRIME CETTE LIGNE ou crée un fichier vide
})
export class AppComponent {
  @ViewChild('cart') cartComponent!: CartComponent;
  isLoggedIn$: Observable<boolean>;

  constructor(private auth: AuthService) {
    this.isLoggedIn$ = this.auth.isLoggedIn$;
  }

  toggleCart(): void {
    this.cartComponent?.toggleCart();
  }

  logout(): void {
    this.auth.logout();
  }

  isSeller(): boolean {
    return this.auth.isSeller();
  }
}