import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CartRequest {
  productId: string;
  quantity: number;
}

export interface Cart {
  id?: string;
  userId?: string;
  items?: any[];
  totalPrice?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly apiUrl = 'http://localhost:8085/api/carts';

  constructor(private readonly http: HttpClient) {}

  getCart(): Observable<Cart> {
    return this.http.get<Cart>(this.apiUrl);
  }

  addToCart(request: CartRequest): Observable<Cart> {
    return this.http.post<Cart>(this.apiUrl, request);
  }

  updateQuantity(request: CartRequest): Observable<Cart> {
    return this.http.put<Cart>(this.apiUrl, request);
  }

  removeFromCart(productId: string): Observable<Cart> {
    return this.http.delete<Cart>(`${this.apiUrl}/${productId}`);
  }

  clearCart(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/clear`);
  }

  checkoutCart(request: { shippingAddress: string; paymentMethod: string }): Observable<any> {
    return this.http.post<any>('http://localhost:8084/api/orders/checkout', request);
  }
}