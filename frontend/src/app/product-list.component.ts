import { Component, OnInit } from '@angular/core';
import { ProductService } from './services/product.service';
import { MediaService } from './services/media.service';
import { CartService } from './services/cart.service';

@Component({
  selector: 'app-product-list',
  template: `
  <div class="d-flex flex-column mb-3">
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h3 class="mb-0">Products</h3>
    </div>
    <div class="d-flex gap-2">
      <input #searchInput class="form-control search-input" type="search" placeholder="Search products..." (input)="onSearch(searchInput.value, minInput.value, maxInput.value)" />
      <input #minInput class="form-control" type="number" placeholder="Min Price" (input)="onSearch(searchInput.value, minInput.value, maxInput.value)" style="max-width: 150px;" />
      <input #maxInput class="form-control" type="number" placeholder="Max Price" (input)="onSearch(searchInput.value, minInput.value, maxInput.value)" style="max-width: 150px;" />
    </div>
  </div>
  <div class="row g-3">
    <div class="col-md-6" *ngFor="let p of filteredProducts">
      <div class="card product-card">
        <div *ngIf="p.images && p.images.length" class="card-img-top text-center" style="padding:8px;">
          <img [src]="p.images[0].imagePath" alt="" style="max-width:100%;max-height:240px;object-fit:contain" />
        </div>
        <div class="card-body">
          <h5 class="card-title">{{p.name}} <span class="badge bg-primary">{{p.price | currency}}</span></h5>
          <div class="small-id">id: {{p.id || p._id}}</div>
          <p class="card-text product-description">{{p.description}}</p>
          <button class="btn btn-sm btn-success mt-2" (click)="addToCart(p.id || p._id)">Ajouter au panier</button>
        </div>
      </div>
    </div>
  </div>
`
})
export class ProductListComponent implements OnInit {
  products: any[] = [];
  filteredProducts: any[] = [];

  constructor(private readonly productService: ProductService, private readonly media: MediaService, private readonly cartService: CartService) {}

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

  addToCart(productId: string) {
    if (!productId) return;
    
    this.cartService.addToCart({ productId, quantity: 1 }).subscribe({
      next: () => console.log('Produit ajouté au panier avec succès'),
      error: err => console.error('Erreur lors de l\'ajout', err)
    });
  }
}
