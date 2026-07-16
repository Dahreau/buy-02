import { Component, OnInit } from '@angular/core';
import { OrderService } from './services/order.service';
import { Order, UserStats, Page } from './models/order.model';

@Component({
  selector: 'app-client-dashboard',
  templateUrl: './client-dashboard.component.html',
})
export class ClientDashboardComponent implements OnInit {
  orders: Order[] = [];
  userStats: UserStats | null = null;
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  filterStatus = '';
  filterKeyword = '';
  loading = false;
  error = '';

  constructor(private readonly orderService: OrderService) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loadStats();
    this.loadOrders();
  }

  loadStats(): void {
    this.orderService.getUserStats().subscribe({
      next: (data) => {
        this.userStats = data;
        console.log('📊 Stats client :', data);
      },
      error: (err) => console.error('Erreur stats:', err)
    });
  }

  loadOrders(): void {
    this.loading = true;
    this.error = '';
    this.orderService.getMyOrders({
      status: this.filterStatus || undefined,
      keyword: this.filterKeyword || undefined,
      page: this.currentPage,
      size: this.pageSize
    }).subscribe({
      next: (page: Page<Order>) => {
        this.orders = page.content;
        console.log('📦 Commandes reçues :', this.orders); // ← regarde la console
        this.totalPages = page.totalPages;
        this.currentPage = page.number;
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger les commandes.';
        this.loading = false;
      }
    });
  }

  onFilterChange(): void {
    this.currentPage = 0;
    this.loadOrders();
  }


  cancelOrder(order: Order): void {
    if (!confirm(`Annuler la commande #${order.id} ?`)) return;
    this.orderService.cancelOrder(order.id).subscribe({
      next: () => {
        alert('Commande annulée.');
        this.loadOrders();
        this.loadStats();
      },
      error: () => alert('Erreur lors de l\'annulation.')
    });
  }

  redoOrder(order: Order): void {
    if (!confirm(`Recréer une commande à partir de #${order.id} ?`)) return;
    this.orderService.redoOrder(order.id).subscribe({
      next: () => {
        alert('Nouvelle commande créée !');
        this.loadOrders();
        this.loadStats();
      },
      error: () => alert('Erreur lors de la recommandation.')
    });
  }

  // ==================== AFFICHAGE DES STATUTS ====================
getStatusLabel(status: string): string {
  const map: { [key: string]: string } = {
    'PENDING': '🟡 En attente',
    'PAID': '🟢 Payée',
    'SHIPPED': '📦 Expédiée',
    'DELIVERED': '✅ Livrée',
    'CANCELLED': '❌ Annulée'
  };
  return map[status] || '❓ Inconnu';
}

getStatusColor(status: string): string {
  const map: { [key: string]: string } = {
    'PENDING': '#f59e0b',
    'PAID': '#10b981',
    'SHIPPED': '#3b82f6',
    'DELIVERED': '#8b5cf6',
    'CANCELLED': '#ef4444'
  };
  return map[status] || '#6b7280';
}
}