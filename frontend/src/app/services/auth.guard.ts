import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

// Guard pour toute personne connectée (client ou vendeur)
export const authGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.getToken()) return true;
  router.navigate(['/login']);
  return false;
};

// Guard pour les vendeurs uniquement
export const sellerGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.getToken()) {
    router.navigate(['/login']);
    return false;
  }
  if (auth.isSeller()) return true;
  router.navigate(['/']);
  return false;
};

// Guard pour l'espace "Mes commandes" : accessible à tout utilisateur connecté,
// vendeur ou non. Un vendeur peut aussi acheter des produits (le panier lui est
// accessible), il doit donc pouvoir consulter l'historique de ses propres achats.
export const clientGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.getToken()) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};