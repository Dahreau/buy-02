import { Component, OnInit } from '@angular/core';
import { ProductService } from './services/product.service';
import { MediaService } from './services/media.service';

@Component({
  selector: 'app-product-list',
  styleUrls: ['../../ui.css'],
  template: `
  <div class="products-header">
    <div>
      <h4>🛍️ Produits</h4>
      <p class="page-subtitle">Découvrez les produits disponibles</p>
    </div>
    <div class="vendor-badge">
      <span class="dot"></span> Catalogue
    </div>
  </div>

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

  <div class="products-grid">
    <div class="product-card" *ngFor="let p of filteredProducts">
      <div class="product-image-wrapper">
        <img *ngIf="p.images && p.images.length" [src]="p.images[0].imagePath" alt="{{p.name}}" />
        <div *ngIf="!p.images || !p.images.length" class="no-image">🖼️</div>
        <span class="stock-badge" [class.in-stock]="p.quantity > 5" [class.low-stock]="p.quantity <= 5 && p.quantity > 0" [class.out-of-stock]="p.quantity === 0">
          {{ p.quantity === 0 ? 'Rupture' : (p.quantity <= 5 ? 'Stock faible' : 'En stock') }}
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
      </div>
    </div>
  </div>
`
})
export class ProductListComponent implements OnInit {
  products: any[] = [];
  filteredProducts: any[] = [];

  constructor(private productService: ProductService, private media: MediaService) {}

  ngOnInit() {
    this.productService.listAll().subscribe(data => {
      this.products = data;
      this.filteredProducts = data;
      // Fetch media for each product (best-effort)
      this.fetchImages(this.filteredProducts);
    });
  }

  onSearch(term: string, minPrice: string, maxPrice: string) {
    const t = (term || '').trim();
    const min = Number.parseFloat(minPrice) || 0;
    const max = Number.parseFloat(maxPrice) || 1000000;

    this.productService.search(t, min, max, 0, 10).subscribe({
      next: response => {
        this.filteredProducts = response.content;
        this.fetchImages(this.filteredProducts);
      },
      error: err => {
        console.error(err);
      }
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

}
