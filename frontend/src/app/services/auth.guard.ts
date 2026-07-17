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

export const clientGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  // Vérifier que l'utilisateur est connecté
  if (!auth.getToken()) {
    router.navigate(['/login']);
    return false;
  }
  // Si c'est un vendeur, on le redirige vers le dashboard vendeur (ou l'accueil)
  if (auth.isSeller()) {
    router.navigate(['/']); 
    return false;
  }
  // Sinon (client), on autorise l'accès
  return true;
};