import { Component, OnInit } from '@angular/core';
import { ProductService } from './services/product.service';
import { MediaService } from './services/media.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-seller-dashboard',
  template: `
    <div class="dashboard-header">
      <div>
        <h1 class="page-title">📊 Tableau de bord vendeur</h1>
        <p class="page-subtitle">Gérez vos produits en toute simplicité</p>
      </div>
      <div class="vendor-badge">
        <span class="dot"></span> En ligne
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📦</div>
        <div>
          <div class="stat-label">Total produits</div>
          <div class="stat-value">{{ myProducts.length }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🔄</div>
        <div>
          <div class="stat-label">En attente</div>
          <div class="stat-value">0</div>
        </div>
      </div>
    </div>

    <div class="form-card">
      <h4 class="form-title">✨ Ajouter un nouveau produit</h4>
      <form (submit)="create($event)">
        <div class="form-group full-width">
          <label>Nom du produit</label>
          <input class="form-control" placeholder="Ex: Sweat à capuche oversize" [(ngModel)]="name" name="name" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>💰 Prix (€)</label>
            <input class="form-control" type="number" placeholder="0.00" [(ngModel)]="price" name="price" />
          </div>
          <div class="form-group">
            <label>📊 Quantité</label>
            <input class="form-control" type="number" placeholder="0" [(ngModel)]="quantity" name="quantity" />
          </div>
        </div>

        <div class="form-group full-width">
          <label>📝 Description</label>
          <textarea class="form-control" rows="2" placeholder="Décrivez votre produit..." [(ngModel)]="description" name="description"></textarea>
        </div>

        <button class="btn-submit" type="submit">➕ Créer le produit</button>
      </form>
    </div>

    <div class="products-header">
      <h4>🛍️ Vos produits</h4>
      <span class="products-count">{{ myProducts.length }} article(s)</span>
    </div>

    <div *ngIf="myProducts.length === 0" class="empty-state">
      <div class="empty-icon">📭</div>
      <p>Aucun produit pour le moment.<br />Commencez par en créer un !</p>
    </div>

    <div class="products-grid">
      <div class="product-card" *ngFor="let p of myProducts">
        <div class="product-image-wrapper">
          <img *ngIf="p.images && p.images.length" [src]="p.images[0].imagePath" alt="{{p.name}}" />
          <div *ngIf="!p.images || !p.images.length" class="no-image">🖼️</div>
          <span class="stock-badge" 
                [class.in-stock]="p.quantity > 5" 
                [class.low-stock]="p.quantity <= 5 && p.quantity > 0" 
                [class.out-of-stock]="p.quantity === 0">
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
          <div class="product-actions">
            <button class="btn-edit" (click)="editProduct(p)">✏️ Modifier</button>
            <button class="btn-delete" (click)="confirmDelete(p)">🗑️ Supprimer</button>
          </div>
        </div>
      </div>
    </div>

    <hr class="divider" />
    <app-media-manager (uploaded)="loadMyProducts()"></app-media-manager>
  `,
  styleUrls: ['../../ui.css']
})
export class SellerDashboardComponent implements OnInit {
  name=''; price=0; quantity=0; description='';
  myProducts: any[] = [];
  allProducts: any[] = [];
  deleteProductId = '';
  deleteError = '';
  currentUserId: string | null = null;
  constructor(private productService: ProductService, private media: MediaService, private auth: AuthService) {}
  ngOnInit(): void { this.loadMyProducts(); }

  loadMyProducts() {
    const userId = this.auth.getUserId();
    this.currentUserId = userId;
    
    this.productService.listAll().subscribe(data => {
      this.allProducts = data;
      if (!userId) {
        this.myProducts = [];
        return;
      }
      
      this.myProducts = data.filter((p: any) => {
        return p.userId === userId;
      });
      
      for (const p of this.myProducts) {
        const pid = p.id || p._id;
        this.media.byProduct(pid).subscribe(meds => p.images = meds, _ => p.images = []);
      }
    });
  }

  create(evt: Event) {
    evt.preventDefault();
    const userId = this.auth.getUserId();
    const body = { name: this.name, price: this.price, quantity: this.quantity, description: this.description, userId: userId };
    this.productService.create(body).subscribe({ next: () => { alert('Created'); this.loadMyProducts(); }, error: () => alert('Create failed') });
  }

  confirmDelete(p: any) {
    if (!confirm('Delete product "' + p.name + '"? This cannot be undone.')) return;
    const id = p.id || p._id;
    this.productService.delete(id).subscribe({ next: () => { alert('Deleted'); this.loadMyProducts(); }, error: () => alert('Delete failed') });
  }

  editProduct(p: any) {
    // placeholder: simple inline edit could be implemented; for now prompt to update name
    const newName = prompt('Edit product name', p.name);
    if (!newName || newName === p.name) return;
    const id = p.id || p._id;
    const body = { name: newName, price: p.price, quantity: p.quantity, description: p.description };
    this.productService.update(id, body).subscribe({ next: () => { alert('Updated'); this.loadMyProducts(); }, error: () => alert('Update failed') });
  }

  deleteSelected() {
    this.deleteError = '';
    if (!this.deleteProductId) { this.deleteError = 'Choose a product first'; return; }
    if (!confirm('Delete selected product? This cannot be undone.')) return;
    const id = this.deleteProductId;
    this.productService.delete(id).subscribe({ next: () => { alert('Deleted'); this.deleteProductId = ''; this.loadMyProducts(); }, error: (e) => { this.deleteError = 'Delete failed'; } });
  }
}
