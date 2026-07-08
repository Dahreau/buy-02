import { Component, OnInit } from '@angular/core';
import { ProductService } from './services/product.service';
import { MediaService } from './services/media.service';
import { CartService } from './services/cart.service';

@Component({
  selector: 'app-product-list',
  styleUrls: ['../../ui.css'],
  template: `
<!-- ===== BOUTON PANIER FLOTTANT (UNIQUE) ===== -->
<button class="cart-fab" (click)="toggleCart()">
  🛒
  <span class="cart-badge">{{ getTotalQuantity() }}</span>
</button>

<!-- ===== PANIER COULISSANT (LE MÊME) ===== -->
<div class="cart-backdrop" [class.show]="isOpen" (click)="toggleCart()"></div>
<div class="cart-panel" [class.open]="isOpen">
  <div class="cart-panel-header">
    <h3>🛒 Mon Panier</h3>
    <button class="close-btn" (click)="toggleCart()">✕</button>
  </div>
  <div class="cart-panel-body">
    <div *ngIf="!cart || cart.items?.length === 0" class="empty-cart">
      <div class="empty-icon">🛒</div>
      <p>Votre panier est vide.</p>
    </div>
    <div *ngIf="cart && cart.items?.length">
      <div class="cart-item" *ngFor="let item of cart.items">
        <div class="mini-card">
          <div class="mini-image">
            <img *ngIf="item.images && item.images.length" [src]="item.images[0].imagePath" alt="{{item.productName}}" />
            <div *ngIf="!item.images || !item.images.length" class="mini-no-image">🖼️</div>
          </div>
          <div class="mini-body">
            <div class="mini-title">{{ item.productName }}</div>
            <div class="mini-meta">{{ item.price | currency }} · Qté : {{ item.quantity }}</div>
          </div>
        </div>
        <div class="item-actions">
          <button class="qty-btn" (click)="updateQuantity(item.productId, item.quantity - 1)">−</button>
          <span class="qty-value">{{ item.quantity }}</span>
          <button class="qty-btn" (click)="updateQuantity(item.productId, item.quantity + 1)">+</button>
          <button class="remove-btn" (click)="removeItem(item.productId)">🗑️</button>
        </div>
      </div>
    </div>
  </div>
  <div class="cart-panel-footer" *ngIf="cart && cart.items?.length">
    <div class="cart-total">
      <span>Total</span>
      <span class="total-price">{{ cart.totalPrice | currency }}</span>
    </div>
    <div class="footer-actions">
      <button class="btn-clear" (click)="clearCart()">Vider</button>
      <button class="btn-checkout" (click)="checkout()">Payer</button>
    </div>
  </div>
</div>

<!-- ===== EN-TÊTE ===== -->
<div class="products-header">
  <div>
    <h4>🛍️ Produits</h4>
    <p class="page-subtitle">Découvrez les produits disponibles</p>
  </div>
  <div class="vendor-badge">
    <span class="dot"></span> Catalogue
  </div>
</div>

<!-- ===== FORMULAIRE DE RECHERCHE ===== -->
<div class="form-card mb-4">
  <div class="form-row" style="grid-template-columns: 2fr 1fr 1fr; margin-bottom: 0;">
    <div class="form-group full-width">
      <label>Recherche</label>
      <input #searchInput class="form-control" type="search" placeholder="Search products..." (input)="onSearch(searchInput.value, minInput.value, maxInput.value)" />
    </div>
    <div class="form-group">
      <label>Prix min</label>
      <input #minInput class="form-control" type="number" placeholder="Min Price" (input)="onSearch(searchInput.value, minInput.value, maxInput.value)" />
    </div>
    <div class="form-group">
      <label>Prix max</label>
      <input #maxInput class="form-control" type="number" placeholder="Max Price" (input)="onSearch(searchInput.value, minInput.value, maxInput.value)" />
    </div>
  </div>
</div>

<!-- ===== GRILLE DES PRODUITS ===== -->
<div class="products-grid">
  <div class="product-card" *ngFor="let p of filteredProducts">
    <div class="product-image-wrapper">
      <img *ngIf="p.images && p.images.length" [src]="p.images[0].imagePath" alt="{{p.name}}" />
      <div *ngIf="!p.images || !p.images.length" class="no-image">🖼️</div>
      <span class="stock-badge" [class.in-stock]="p.quantity > 5" [class.low-stock]="p.quantity <= 5 && p.quantity > 0" [class.out-of-stock]="p.quantity === 0">
        {{ p.quantity === 0 ? 'Rupture' : (p.quantity <= 10 ? 'Stock faible' : 'En stock') }}
      </span>
    </div>

    <div class="product-body">
      <div class="product-header">
        <h5 class="product-name">{{ p.name }}</h5>
        <span class="product-price">{{ p.price | currency:'EUR' }}</span>
      </div>
      <p class="product-description">{{ p.description || 'Aucune description' }}</p>
      <div class="product-meta">
        <span class="product-id">🆔 {{ (p.id || p._id) | slice:0:8 }}...</span>
        <span class="product-qty">📦 {{ p.quantity }} unités</span>
      </div>

      <!-- ===== COMPTEUR + BOUTON AJOUTER ===== -->
      <div class="product-cart-actions">
        <div class="qty-selector">
          <button class="qty-btn" type="button" (click)="decreaseQty(p)" [disabled]="getQty(p) <= 1 || p.quantity === 0">−</button>
          <span class="qty-value">{{ getQty(p) }}</span>
          <button class="qty-btn" type="button" (click)="increaseQty(p)" [disabled]="p.quantity === 0 || getQty(p) >= p.quantity">+</button>
        </div>
        <button class="btn-add-to-cart" type="button" (click)="addToCart(p)" [disabled]="p.quantity === 0">
          🛒 Ajouter
        </button>
      </div>
    </div>
  </div>
</div>
  `
})
export class ProductListComponent implements OnInit {
  products: any[] = [];
  filteredProducts: any[] = [];
  quantities: { [productId: string]: number } = {};
  cart: any = null;
  isOpen = false;
  constructor(private productService: ProductService, private media: MediaService, private cartService: CartService) {}
  
  ngOnInit() {
    this.productService.listAll().subscribe(data => {
      this.products = data;
      this.filteredProducts = data;
      this.fetchImages(this.filteredProducts);
      this.initQuantities(this.filteredProducts);
    });
  }

  // Initialise les quantités à 1 pour chaque produit
  initQuantities(productList: any[]) {
    for (const p of productList) {
      const id = p.id || p._id;
      this.quantities[id] = 1;
    }
  }

  // Récupère la quantité sélectionnée pour un produit
  getQty(p: any): number {
    const id = p.id || p._id;
    return this.quantities[id] || 1;
  }

  // Augmente la quantité sélectionnée
  increaseQty(p: any) {
    const id = p.id || p._id;
    if (this.quantities[id] < p.quantity) {
      this.quantities[id] = (this.quantities[id] || 1) + 1;
    }
  }

  // Diminue la quantité sélectionnée
  decreaseQty(p: any) {
    const id = p.id || p._id;
    if (this.quantities[id] > 1) {
      this.quantities[id] = (this.quantities[id] || 1) - 1;
    }
  }

  onSearch(term: string, minPrice: string, maxPrice: string) {
    const t = (term || '').trim();
    const min = Number.parseFloat(minPrice) || 0;
    const max = Number.parseFloat(maxPrice) || 1000000;

    this.productService.search(t, min, max, 0, 10).subscribe({
      next: response => {
        this.filteredProducts = response.content;
        this.fetchImages(this.filteredProducts);
        this.initQuantities(this.filteredProducts);
      },
      error: err => console.error(err)
    });
  }

  fetchImages(productList: any[]) {
    for (const p of productList) {
      const pid = p.id || p._id;
      this.media.byProduct(pid).subscribe({
        next: meds => { p.images = meds; },
        error: _ => { p.images = []; }
      });
    }
  } 
  loadCart() {
  this.cartService.getCart().subscribe({
    next: (data) => { this.cart = data; },
    error: (err) => console.error(err)
  });
}

  // Ouvrir/fermer le panier
  toggleCart() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.loadCart();
    }
  }

  // Calculer le nombre total d'articles
  getTotalQuantity(): number {
    if (!this.cart || !this.cart.items) {
      return 0;
    }
    return this.cart.items.reduce((acc, item) => acc + item.quantity, 0);
  }
  

  // Ajout au panier AVEC la quantité sélectionnée
  // Ajout au panier AVEC la quantité sélectionnée
addToCart(p: any) {
  const productId = p.id || p._id;
  const qty = this.getQty(p);
  this.cartService.addToCart({ productId, quantity: qty }).subscribe({
    next: () => {
      alert(`✅ ${qty} × "${p.name}" ajouté au panier !`);
      // Réinitialiser la quantité à 1 après ajout
      this.quantities[productId] = 1;
      // 🔥 Recharger le panier pour mettre à jour le badge
      this.loadCart();
    },
    error: (e) => {
      console.error(e);
      alert('❌ Échec de l\'ajout au panier');
    }
  });
}
}