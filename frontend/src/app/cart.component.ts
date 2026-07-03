import { Component, OnInit } from '@angular/core';
import { CartService, Cart, CartRequest } from './services/cart.service';

@Component({
  selector: 'app-cart',
  templateUrl: 'cart.component.html',
  styleUrls: ['cart.component.css']
})
export class CartComponent implements OnInit {
  cart: Cart | null = null;
  isOpen = false;

  constructor(private readonly cartService: CartService) {}

  ngOnInit(): void {
    this.loadCart();
  }

  loadCart(): void {
    this.cartService.getCart().subscribe({
      next: (data) => this.cart = data,
      error: (err) => console.error(err)
    });
  }

  toggleCart(): void {
    this.isOpen = !this.isOpen;
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity < 1) {
      return;
    }
    const request: CartRequest = { productId, quantity };
    this.cartService.updateQuantity(request).subscribe({
      next: (data) => this.cart = data,
      error: (err) => console.error(err)
    });
  }

  removeItem(productId: string): void {
    this.cartService.removeFromCart(productId).subscribe({
      next: (data) => this.cart = data,
      error: (err) => console.error(err)
    });
  }

  clearCart(): void {
    this.cartService.clearCart().subscribe({
      next: () => this.cart = null,
      error: (err) => console.error(err)
    });
  }
}