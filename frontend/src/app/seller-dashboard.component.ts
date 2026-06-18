import { Component, OnInit } from '@angular/core';
import { ProductService } from './services/product.service';
import { MediaService } from './services/media.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-seller-dashboard',
  template: `
    <h3>Seller Dashboard</h3>
    <div class="card mb-4">
      <div class="card-body">
        <form (submit)="create($event)">
          <div class="mb-3">
            <label class="form-label">Name</label>
            <input class="form-control" [(ngModel)]="name" name="name" />
          </div>
          <div class="mb-3 row">
            <div class="col">
              <label class="form-label">Price</label>
              <input class="form-control" type="number" [(ngModel)]="price" name="price" />
            </div>
            <div class="col">
              <label class="form-label">Quantity</label>
              <input class="form-control" type="number" [(ngModel)]="quantity" name="quantity" />
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label">Description</label>
            <textarea class="form-control" [(ngModel)]="description" name="description"></textarea>
          </div>
          <button class="btn btn-primary" type="submit">Create Product</button>
        </form>
      </div>
    </div>

    <h4>Your Products</h4>
    <div class="row">
      <div class="col-md-6" *ngFor="let p of myProducts">
        <div class="card mb-3">
          <div *ngIf="p.images && p.images.length" class="p-2 text-center">
            <img [src]="p.images[0].imagePath" style="max-width:160px;max-height:120px;object-fit:contain" />
          </div>
          <div class="card-body">
            <h5>{{p.name}} <small class="text-muted">{{p.price | currency}}</small></h5>
            <div class="small-id">id: {{p.id || p._id}}</div>
            <p class="mb-0">{{p.description}}</p>
            <div class="mt-3 d-flex gap-2">
              <button class="btn btn-sm btn-outline-primary" (click)="editProduct(p)"><i class="bi bi-pencil"></i> Edit</button>
              <button class="btn btn-sm btn-outline-danger" (click)="confirmDelete(p)"><i class="bi bi-trash"></i> Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <hr/>
    <app-media-manager (uploaded)="loadMyProducts()"></app-media-manager>
  `
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
