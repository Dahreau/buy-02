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
  shippingAddress: string = '';

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
    if (this.isOpen) {
      this.loadCart();
    }
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

  validateCart(): void {
    if (!this.shippingAddress || this.shippingAddress.trim() === '') {
      alert('Veuillez entrer une adresse de livraison.');
      return;
    }

    const payload = {
      shippingAddress: this.shippingAddress,
      paymentMethod: 'PAY_ON_DELIVERY'
    };

    this.cartService.checkoutCart(payload).subscribe({
      next: () => {
        this.isOpen = false;
        this.shippingAddress = '';
        this.loadCart();
        alert('Commande validée avec succès ! Paiement à la livraison.');
      },
      error: (err) => {
        console.error('Erreur lors de la validation', err);
      }
    });
  }
}