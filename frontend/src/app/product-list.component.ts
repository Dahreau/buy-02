import { Component, OnInit, ViewChild } from '@angular/core';
import { ProductService } from './services/product.service';
import { MediaService } from './services/media.service';
import { AppComponent } from './app.component';
import { CartService } from './services/cart.service';

@Component({
  selector: 'app-product-list',
  styleUrls: ['../styles/ui.css'],
  template: `
      
    <!-- ===== EN-TÊTE PRODUITS ===== -->
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
  @ViewChild(AppComponent) appComponent!: AppComponent;
  products: any[] = [];
  filteredProducts: any[] = [];
  quantities: { [productId: string]: number } = {};
  cart: any = null;
  isOpen = false;

  constructor(
    private readonly productService: ProductService,
    private readonly media: MediaService,
    private readonly cartService: CartService
  ) {}

  
  ngOnInit() {
    this.productService.listAll().subscribe(data => {
      this.products = data;
      this.filteredProducts = data;
      this.fetchImages(this.filteredProducts);
      this.initQuantities(this.filteredProducts);
    });
  }

  initQuantities(productList: any[]) {
    for (const p of productList) {
      const id = p.id || p._id;
      this.quantities[id] = 1;
    }
  }

  getQty(p: any): number {
    const id = p.id || p._id;
    return this.quantities[id] || 1;
  }

  increaseQty(p: any) {
    const id = p.id || p._id;
    if (this.quantities[id] < p.quantity) {
      this.quantities[id] = (this.quantities[id] || 1) + 1;
    }
  }

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
  
  addToCart(p: any) {
    const productId = p.id || p._id;
    const qty = this.getQty(p);
    this.cartService.addToCart({ productId, quantity: qty }).subscribe({
      next: () => {
        alert(`✅ ${qty} × "${p.name}" ajouté au panier !`);
        this.quantities[productId] = 1;
        // 🔥 Recharge le panier via AppComponent
        this.appComponent.loadCart();
      },
      error: (e) => {
        console.error(e);
        alert('❌ Échec de l\'ajout au panier');
      }
    });
  }

  checkout() {
    // Implémentation simplifiée
    alert('Fonctionnalité checkout à venir');
  }
}